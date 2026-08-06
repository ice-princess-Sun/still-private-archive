import { useEffect, useState } from "react";
import { supabase } from "./supabase";

type Delivery = { id: string; entry_id: string; recipient_email: string; reason: "publish" | "manual"; status: "pending" | "sent" | "failed"; error_message: string | null; attempt_count: number; sent_at: string | null; created_at: string; };

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}

export function NotificationHistory({ onBack }: { onBack: () => void }) {
  const [records, setRecords] = useState<Delivery[]>([]); const [titles, setTitles] = useState<Record<string, string>>({}); const [loading, setLoading] = useState(true); const [message, setMessage] = useState("");
  async function load() {
    setLoading(true); setMessage("");
    const { data, error } = await supabase.from("notification_deliveries").select("id,entry_id,recipient_email,reason,status,error_message,attempt_count,sent_at,created_at").order("created_at", { ascending: false }).limit(100);
    if (error) { setMessage(`通知记录加载失败：${error.message}`); setLoading(false); return; }
    const next = (data ?? []) as Delivery[]; setRecords(next);
    const ids = [...new Set(next.map((record) => record.entry_id))];
    if (ids.length) { const { data: entries } = await supabase.from("entries").select("id,title").in("id", ids); setTitles(Object.fromEntries((entries ?? []).map((entry) => [entry.id, entry.title]))); }
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);
  return <section className="page notification-history"><button className="back" onClick={onBack}>← 返回管理</button><header><p className="eyebrow">ADMINISTRATION</p><h1>通知记录</h1><p className="muted">显示最近 100 条邮件投递记录；失败原因会保留在这里，方便检查。</p></header>{message && <p className="error">{message}</p>}{loading ? <p className="muted">正在加载…</p> : <div className="delivery-list">{records.length ? records.map((record) => <article key={record.id}><div><p className="eyebrow">{record.reason === "manual" ? "手动发送" : "发布通知"}</p><h2>{titles[record.entry_id] ?? "已删除的图文"}</h2><p>{record.recipient_email}</p><time>{formatTime(record.created_at)} · 第 {record.attempt_count} 次尝试</time>{record.error_message && <p className="error">{record.error_message}</p>}</div><span className={`delivery-status ${record.status}`}>{record.status === "sent" ? "已发送" : record.status === "failed" ? "失败" : "等待中"}</span></article>) : <div className="empty">还没有通知发送记录。</div>}</div>}</section>;
}
