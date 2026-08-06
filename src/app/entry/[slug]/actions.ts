"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/entries";
import { requireUser } from "@/lib/supabase/auth";

const MAX_COMMENT_LENGTH = 500;

export type CommentActionState = {
  ok: boolean;
  message: string;
  completedAt?: number;
};

function commentBody(formData: FormData) {
  const body = String(formData.get("body") ?? "").trim();

  if (!body) throw new Error("请写下留言内容");
  if (body.length > MAX_COMMENT_LENGTH) {
    throw new Error(`留言不能超过 ${MAX_COMMENT_LENGTH} 个字符`);
  }

  return body;
}

function authorLabel(email?: string) {
  return (email?.split("@", 1)[0] || "member").slice(0, 80);
}

function result(ok: boolean, message: string): CommentActionState {
  return { ok, message, completedAt: Date.now() };
}

export async function createComment(
  entryId: string,
  _previousState: CommentActionState,
  formData: FormData,
): Promise<CommentActionState> {
  try {
    const { supabase, user } = await requireUser();
    const body = commentBody(formData);
    const { data: entry, error: entryError } = await supabase
      .from("entries")
      .select("id,slug,published")
      .eq("id", entryId)
      .single();

    if (entryError || !entry?.published) {
      return result(false, "这篇内容暂时无法留言");
    }

    const { error } = await supabase.from("entry_comments").insert({
      entry_id: entry.id,
      author_id: user.id,
      author_label: authorLabel(user.email),
      body,
    });

    if (error) return result(false, "留言发布失败，请稍后重试");

    revalidatePath(`/entry/${entry.slug}`);
    return result(true, "留言已留下");
  } catch (error) {
    return result(
      false,
      error instanceof Error ? error.message : "留言发布失败，请稍后重试",
    );
  }
}

export async function updateComment(
  commentId: string,
  _previousState: CommentActionState,
  formData: FormData,
): Promise<CommentActionState> {
  try {
    const { supabase, user } = await requireUser();
    const body = commentBody(formData);
    const { data: comment } = await supabase
      .from("entry_comments")
      .select("id,entry_id,author_id")
      .eq("id", commentId)
      .single();

    if (!comment || comment.author_id !== user.id) {
      return result(false, "你只能修改自己的留言");
    }

    const { data: entry } = await supabase
      .from("entries")
      .select("slug,published")
      .eq("id", comment.entry_id)
      .single();

    if (!entry?.published) return result(false, "这篇内容暂时无法修改留言");

    const { error } = await supabase
      .from("entry_comments")
      .update({ body })
      .eq("id", comment.id)
      .eq("author_id", user.id);

    if (error) return result(false, "留言修改失败，请稍后重试");

    revalidatePath(`/entry/${entry.slug}`);
    return result(true, "修改已保存");
  } catch (error) {
    return result(
      false,
      error instanceof Error ? error.message : "留言修改失败，请稍后重试",
    );
  }
}

export async function deleteComment(commentId: string): Promise<CommentActionState> {
  try {
    const { supabase, user } = await requireUser();
    const { data: comment } = await supabase
      .from("entry_comments")
      .select("id,entry_id,author_id")
      .eq("id", commentId)
      .single();

    if (!comment) return result(false, "找不到这条留言");

    const admin = await isAdmin(supabase);
    if (comment.author_id !== user.id && !admin) {
      return result(false, "你没有权限删除这条留言");
    }

    const { data: entry } = await supabase
      .from("entries")
      .select("slug")
      .eq("id", comment.entry_id)
      .single();
    const { error } = await supabase
      .from("entry_comments")
      .delete()
      .eq("id", comment.id);

    if (error) return result(false, "留言删除失败，请稍后重试");

    if (entry?.slug) revalidatePath(`/entry/${entry.slug}`);
    return result(true, "留言已删除");
  } catch {
    return result(false, "留言删除失败，请稍后重试");
  }
}
