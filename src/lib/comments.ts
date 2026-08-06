export type EntryComment = {
  id: string;
  entry_id: string;
  author_id: string | null;
  author_label: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export const COMMENT_SELECT =
  "id,entry_id,author_id,author_label,body,created_at,updated_at";

export function wasEdited(comment: Pick<EntryComment, "created_at" | "updated_at">) {
  return (
    new Date(comment.updated_at).getTime() -
      new Date(comment.created_at).getTime() >
    1000
  );
}
