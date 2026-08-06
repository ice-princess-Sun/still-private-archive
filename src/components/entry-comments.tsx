"use client";

import {
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  createComment,
  deleteComment,
  updateComment,
  type CommentActionState,
} from "@/app/entry/[slug]/actions";
import { wasEdited, type EntryComment } from "@/lib/comments";

const EMPTY_STATE: CommentActionState = { ok: false, message: "" };

export function EntryComments({
  entryId,
  comments,
  currentUserId,
  isAdmin,
  canComment,
}: {
  entryId: string;
  comments: EntryComment[];
  currentUserId: string;
  isAdmin: boolean;
  canComment: boolean;
}) {
  const router = useRouter();
  const [length, setLength] = useState(0);
  const [state, setState] = useState(EMPTY_STATE);
  const [pending, startSubmit] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startSubmit(async () => {
      const response = await createComment(entryId, EMPTY_STATE, formData);
      setState(response);
      if (!response.ok) return;
      form.reset();
      setLength(0);
      router.refresh();
    });
  }

  return (
    <section className="mx-auto max-w-4xl border-t hairline pb-8 pt-12 md:pt-16">
      <div className="flex items-end justify-between gap-6 border-b hairline pb-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted">
            Notes
          </p>
          <h2 className="mt-3 font-serif text-3xl tracking-[-0.02em] md:text-4xl">
            留言
          </h2>
        </div>
        <span className="font-serif text-2xl text-muted">
          {String(comments.length).padStart(2, "0")}
        </span>
      </div>

      {canComment ? (
      <form onSubmit={submit} className="border-b hairline py-8 md:py-10">
        <label
          htmlFor="new-comment"
          className="text-[10px] uppercase tracking-[0.2em] text-muted"
        >
          Leave a note
        </label>
        <textarea
          id="new-comment"
          name="body"
          required
          maxLength={500}
          rows={4}
          onChange={(event) => {
            setLength(event.currentTarget.value.length);
            if (state.message) setState(EMPTY_STATE);
          }}
          placeholder="写下此刻想留下的话……"
          className="mt-4 block w-full resize-y border-0 border-b hairline bg-transparent px-0 py-4 font-serif text-xl leading-8 outline-none placeholder:text-muted/55 focus:border-ink md:text-2xl"
        />
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <p
            aria-live="polite"
            className={`text-xs ${state.message && !state.ok ? "text-[#8c453a]" : "text-muted"}`}
          >
            {state.message || `${length} / 500`}
          </p>
          <button
            type="submit"
            disabled={pending}
            className="pressable inline-flex min-h-11 cursor-pointer items-center gap-8 bg-ink px-5 py-3 text-paper disabled:cursor-wait disabled:opacity-55"
          >
            <span className="text-[10px] font-medium uppercase tracking-[0.18em]">
              {pending ? "Sending" : "Leave a note"}
            </span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </form>
      ) : (
        <p className="border-b hairline py-8 text-sm text-muted">
          草稿发布后，成员才可以在这里留言。
        </p>
      )}

      <div className="divide-y divide-[var(--line)]">
        {comments.length ? (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              canEdit={comment.author_id === currentUserId}
              canDelete={comment.author_id === currentUserId || isAdmin}
            />
          ))
        ) : (
          <div className="py-14 text-center">
            <p className="font-serif text-2xl">这里还很安静</p>
            <p className="mt-3 text-xs tracking-[0.08em] text-muted">
              成为第一个留下文字的人。
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function CommentItem({
  comment,
  canEdit,
  canDelete,
}: {
  comment: EntryComment;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deleting, startDelete] = useTransition();
  const [state, setState] = useState(EMPTY_STATE);
  const [pending, startSave] = useTransition();

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startSave(async () => {
      const response = await updateComment(comment.id, EMPTY_STATE, formData);
      setState(response);
      if (!response.ok) return;
      setEditing(false);
      router.refresh();
    });
  }

  function remove() {
    if (!window.confirm("确定删除这条留言吗？此操作无法撤销。")) return;

    startDelete(async () => {
      const response = await deleteComment(comment.id);
      if (!response.ok) {
        setDeleteMessage(response.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <article className="grid gap-5 py-8 md:grid-cols-[9rem_1fr] md:gap-10 md:py-10">
      <div>
        <p className="truncate text-[10px] font-medium uppercase tracking-[0.16em]">
          {comment.author_label}
        </p>
        <time
          dateTime={comment.created_at}
          className="mt-2 block text-[10px] tracking-[0.08em] text-muted"
        >
          {formatCommentDate(comment.created_at)}
        </time>
        {wasEdited(comment) && (
          <span className="mt-1 block text-[9px] uppercase tracking-[0.12em] text-muted">
            Edited
          </span>
        )}
      </div>

      <div className="min-w-0">
        {editing ? (
          <form onSubmit={save}>
            <textarea
              name="body"
              required
              maxLength={500}
              rows={4}
              defaultValue={comment.body}
              className="block w-full resize-y border hairline bg-transparent p-4 font-serif text-lg leading-8 outline-none focus:border-ink"
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <p
                aria-live="polite"
                className={`text-xs ${state.message && !state.ok ? "text-[#8c453a]" : "text-muted"}`}
              >
                {state.message}
              </p>
              <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.14em]">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="interactive-link cursor-pointer text-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="interactive-link cursor-pointer font-medium disabled:cursor-wait disabled:opacity-55"
                >
                  {pending ? "Saving" : "Save"}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <>
            <p className="whitespace-pre-wrap break-words font-serif text-xl leading-[1.75] md:text-2xl">
              {comment.body}
            </p>
            {(canEdit || canDelete) && (
              <div className="mt-5 flex items-center gap-5 text-[9px] uppercase tracking-[0.16em] text-muted">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setState(EMPTY_STATE);
                      setEditing(true);
                    }}
                    className="interactive-link cursor-pointer"
                  >
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={remove}
                    className="interactive-link cursor-pointer text-[#8c453a] disabled:cursor-wait disabled:opacity-50"
                  >
                    {deleting ? "Deleting" : "Delete"}
                  </button>
                )}
              </div>
            )}
            {deleteMessage && (
              <p className="mt-3 text-xs text-[#8c453a]" aria-live="polite">
                {deleteMessage}
              </p>
            )}
          </>
        )}
      </div>
    </article>
  );
}

function formatCommentDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
