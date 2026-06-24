import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/entries";

export async function requireUser() {
  const supabase = await createClient();
  if (!supabase) redirect("/login?error=missing-config");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  return { supabase, user };
}

export async function requireAdmin() {
  const context = await requireUser();
  if (!(await isAdmin(context.supabase))) redirect("/");
  return context;
}
