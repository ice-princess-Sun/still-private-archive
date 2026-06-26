-- STILL database, permissions, and private image storage.
-- Safe to run more than once in Supabase SQL Editor.

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  summary text not null default '',
  body text not null default '',
  image_path text,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.entries
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists author_id uuid references auth.users(id) on delete set null,
  add column if not exists author_email text,
  add column if not exists display_order integer;

with ranked_entries as (
  select
    id,
    row_number() over (
      order by coalesce(published_at, created_at) desc, created_at desc
    ) * 1000 as sort_value
  from public.entries
  where display_order is null
)
update public.entries
set display_order = ranked_entries.sort_value
from ranked_entries
where entries.id = ranked_entries.id;

alter table public.entries
  alter column display_order set default 0;

create index if not exists entries_display_order_idx
on public.entries (display_order, published_at desc, created_at desc);

create table if not exists public.entry_images (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  storage_path text not null unique,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists entry_images_entry_position_idx
on public.entry_images (entry_id, position);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Bootstrap the oldest account as the first administrator.
insert into public.admins (user_id)
select id from auth.users order by created_at asc limit 1
on conflict (user_id) do nothing;

-- Backfill the author of content created before author tracking existed.
update public.entries e
set
  author_id = u.id,
  author_email = u.email
from (
  select id, email from auth.users order by created_at asc limit 1
) u
where e.author_id is null;

-- Migrate each legacy cover image into the multi-image table once.
insert into public.entry_images (entry_id, storage_path, position)
select id, image_path, 0
from public.entries
where image_path is not null
on conflict (storage_path) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins where user_id = (select auth.uid())
  );
$$;

grant execute on function public.is_admin() to authenticated;
grant select on public.entries to authenticated;
grant insert, update, delete on public.entries to authenticated;
grant select, insert, update, delete on public.entry_images to authenticated;
grant select on public.admins to authenticated;

alter table public.entries enable row level security;
alter table public.entry_images enable row level security;
alter table public.admins enable row level security;

drop policy if exists "Authenticated members can read published entries" on public.entries;
drop policy if exists "Members read published entries and admins read all" on public.entries;
drop policy if exists "Admins insert entries" on public.entries;
drop policy if exists "Admins update entries" on public.entries;
drop policy if exists "Admins delete entries" on public.entries;
drop policy if exists "Admins can read their role" on public.admins;
drop policy if exists "Members read images for visible entries" on public.entry_images;
drop policy if exists "Admins insert entry images" on public.entry_images;
drop policy if exists "Admins update entry images" on public.entry_images;
drop policy if exists "Admins delete entry images" on public.entry_images;

create policy "Members read published entries and admins read all"
on public.entries for select to authenticated
using (published = true or public.is_admin());

create policy "Admins insert entries"
on public.entries for insert to authenticated
with check (public.is_admin());

create policy "Admins update entries"
on public.entries for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins delete entries"
on public.entries for delete to authenticated
using (public.is_admin());

create policy "Admins can read their role"
on public.admins for select to authenticated
using (user_id = (select auth.uid()));

create policy "Members read images for visible entries"
on public.entry_images for select to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.entries
    where entries.id = entry_images.entry_id
      and entries.published = true
  )
);

create policy "Admins insert entry images"
on public.entry_images for insert to authenticated
with check (public.is_admin());

create policy "Admins update entry images"
on public.entry_images for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins delete entry images"
on public.entry_images for delete to authenticated
using (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'archive-images',
  'archive-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated members can read archive images" on storage.objects;
drop policy if exists "Members read archive images" on storage.objects;
drop policy if exists "Admins upload archive images" on storage.objects;
drop policy if exists "Admins update archive images" on storage.objects;
drop policy if exists "Admins delete archive images" on storage.objects;

create policy "Members read archive images"
on storage.objects for select to authenticated
using (bucket_id = 'archive-images');

create policy "Admins upload archive images"
on storage.objects for insert to authenticated
with check (bucket_id = 'archive-images' and public.is_admin());

create policy "Admins update archive images"
on storage.objects for update to authenticated
using (bucket_id = 'archive-images' and public.is_admin())
with check (bucket_id = 'archive-images' and public.is_admin());

create policy "Admins delete archive images"
on storage.objects for delete to authenticated
using (bucket_id = 'archive-images' and public.is_admin());
