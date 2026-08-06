import { useEffect, useState } from "react";
import { supabase } from "./supabase";

type Comment = {
  id: string;
  entry_id: string;
  author_id: string | null;
  author_label: string;
  body: string;
  created_at: string;
  updated_at: string;
};

const COMMENT_SELECT = "id,entry_id,author_id,author_label,body,created_at,updated_at";

function formatCommentDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(value));
}

function wasEdited(comment: Comment) {
  return new Date(comment.updated_at).getTime() - new Date(comment.created_at).getTime() > 1000;
}

export function EntryComments({ entryId, currentUserId, currentUserEmail, isAdmin }: { entryId: string; currentUserId: string; currentUserEmail?: string; isAdmin: boolean }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("entry_comments").select(COMMENT_SELECT).eq("entry_id", entryId).order("created_at", { ascending: true });
    if (error) setMessage(`留言加载失败：${error.message}`);
    else setComments((data ?? []) as Comment[]);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [entryId]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const text = body.trim();
    if (!text) return;
    if (text.length > 500) return setMessage("留言不能超过 500 个字符。");
    setSaving(true); setMessage("");
    const authorLabel = (currentUserEmail?.split("@", 1)[0] || "member").slice(0, 80);
    const { error } = await supabase.from("entry_comments").insert({ entry_id: entryId, author_id: currentUserId, author_label: authorLabel, body: text });
    setSaving(false);
    if (error) return setMessage(`留言发布失败：${error.message}`);
    setBody(""); setMessage("留言已留下。"); await load();
  }

  async function save(commentId: string) {
    const text = editBody.trim();
    if (!text) return setMessage("请写下留言内容。");
    if (text.length > 500) return setMessage("留言不能超过 500 个字符。");
    setSaving(true); setMessage("");
    const { error } = await supabase.from("entry_comments").update({ body: text }).eq("id", commentId).eq("author_id", currentUserId);
    setSaving(false);
    if (error) return setMessage(`留言修改失败：${error.message}`);
    setEditingId(null); setMessage("修改已保存。"); await load();
  }

  async function remove(comment: Comment) {
    if (!window.confirm("确定删除这条留言吗？此操作不可撤销。")) return;
    setSaving(true); setMessage("");
    const { error } = await supabase.from("entry_comments").delete().eq("id", comment.id);
    setSaving(false);
    if (error) return setMessage(`留言删除失败：${error.message}`);
    setMessage("留言已删除。"); await load();
  }

  return <section className="comments"><div className="comments-heading"><div><p className="eyebrow">NOTES</p><h2>留言</h2></div><span>{String(comments.length).padStart(2, "0")}</span></div><form className="comment-form" onSubmit={(event) => void submit(event)}><label>留下句话<textarea value={body} maxLength={500} rows={4} onChange={(event) => { setBody(event.target.value); if (message) setMessage(""); }} placeholder="写下此刻想留下的话……" /></label><div><p className={message.includes("失败") ? "error" : "muted"}>{message || `${body.length} / 500`}</p><button className="primary compact" disabled={saving}>{saving ? "发送中…" : "发布留言"}<span>→</span></button></div></form><div className="comment-list">{loading ? <p className="muted">正在加载留言…</p> : comments.length ? comments.map((comment) => { const canEdit = comment.author_id === currentUserId; const canDelete = canEdit || isAdmin; const editing = editingId === comment.id; return <article key={comment.id}><header><div><strong>{comment.author_label}</strong><time>{formatCommentDate(comment.created_at)}{wasEdited(comment) && " · 已编辑"}</time></div>{(canEdit || canDelete) && <div className="comment-actions">{canEdit && <button onClick={() => { setEditingId(comment.id); setEditBody(comment.body); setMessage(""); }}>编辑</button>}{canDelete && <button className="danger" disabled={saving} onClick={() => void remove(comment)}>删除</button>}</div>}</header>{editing ? <div className="comment-editor"><textarea value={editBody} maxLength={500} rows={4} onChange={(event) => setEditBody(event.target.value)} /><div><button onClick={() => setEditingId(null)}>取消</button><button disabled={saving} onClick={() => void save(comment.id)}>{saving ? "保存中…" : "保存"}</button></div></div> : <p>{comment.body}</p>}</article>; }) : <div className="comment-empty"><strong>这里还很安静</strong><span>成为第一个留下文字的人。</span></div>}</div></section>;
}
