import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App as NativeApp } from "@capacitor/app";
import { Camera, MediaTypeSelection } from "@capacitor/camera";
import type { User } from "@supabase/supabase-js";
import { loadSavedCredentials, saveSavedCredentials } from "./secure-credentials";
import { setRememberLogin, supabase } from "./supabase";

const MAX_IMAGES = 10;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ENTRY_SELECT = "*, entry_images(*)";
const HOME_CACHE_TTL = 30 * 60 * 1000;
const LOGIN_HERO_IMAGES = [
  "https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=2200&q=88",
  "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=2200&q=88",
  "https://images.unsplash.com/photo-1425913397330-cf8af2ff40a1?auto=format&fit=crop&w=2200&q=88",
  "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=2200&q=88",
];

type EntryImage = {
  id: string;
  storage_path: string;
  position: number;
  created_at: string;
  signedUrl?: string;
};

type Entry = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  image_path: string | null;
  published: boolean;
  published_at: string | null;
  display_order: number;
  created_at: string;
  author_email: string | null;
  entry_images?: EntryImage[];
  images: EntryImage[];
};

type Screen =
  | { name: "home" }
  | { name: "entry"; entry: Entry; returnTo: "home" | "admin" }
  | { name: "admin" }
  | { name: "editor"; entry?: Entry };

type DraftImage = {
  key: string;
  previewUrl: string;
  existing?: EntryImage;
  file?: File;
};

type EditorDraft = {
  title: string;
  slug: string;
  summary: string;
  body: string;
  published: boolean;
  images: DraftImage[];
};

type HomeCache = {
  savedAt: number;
  entries: Entry[];
};

type NotificationResult = {
  total?: number;
  sent?: number;
  failed?: number;
  skipped?: number;
};

function homeCacheKey(userId: string) {
  return `still.home-cache.v1.${userId}`;
}

function readHomeCache(userId: string): HomeCache | null {
  try {
    const value = localStorage.getItem(homeCacheKey(userId));
    if (!value) return null;
    const parsed = JSON.parse(value) as HomeCache;
    return Array.isArray(parsed.entries) && typeof parsed.savedAt === "number" ? parsed : null;
  } catch {
    return null;
  }
}

function writeHomeCache(userId: string, entries: Entry[]) {
  try {
    localStorage.setItem(homeCacheKey(userId), JSON.stringify({ savedAt: Date.now(), entries }));
  } catch {
    // The app still works when the device has no remaining local storage space.
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "操作未完成，请重试。";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

async function requestEntryNotification(entryId: string, reason: "publish" | "manual") {
  const { data, error } = await supabase.functions.invoke<NotificationResult>("send-entry-notification", {
    body: { entryId, reason },
  });
  if (error) throw error;
  if (!data || typeof data.total !== "number") {
    throw new Error("通知服务没有返回有效结果，请稍后重试。");
  }
  return {
    total: data.total,
    sent: Number(data.sent ?? 0),
    failed: Number(data.failed ?? 0),
    skipped: Number(data.skipped ?? 0),
  };
}

function notificationMessage(result: Required<NotificationResult>) {
  if (result.total === 0) return "没有可接收通知的成员。";
  if (result.failed > 0) {
    return `通知未全部发出：成功 ${result.sent} 人，失败 ${result.failed} 人${result.skipped ? `，已跳过 ${result.skipped} 人` : ""}。`;
  }
  return `通知已发出：成功 ${result.sent} 人${result.skipped ? `，已跳过 ${result.skipped} 人` : ""}。`;
}

function extensionFrom(name: string, type?: string) {
  const suffix = name.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(suffix ?? "")) {
    return suffix === "jpeg" ? "jpg" : suffix!;
  }
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "jpg";
}

async function enrichEntries(rawEntries: Entry[]) {
  return Promise.all(
    rawEntries.map(async (entry) => {
      const source = [...(entry.entry_images ?? [])].sort((a, b) => a.position - b.position);
      const images = await Promise.all(
        source.map(async (image) => {
          const { data } = await supabase.storage
            .from("archive-images")
            .createSignedUrl(image.storage_path, 6 * 60 * 60);
          return { ...image, signedUrl: data?.signedUrl };
        }),
      );
      return { ...entry, images };
    }),
  );
}

async function isAdmin() {
  const { data, error } = await supabase.rpc("is_admin");
  return !error && data === true;
}

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [entries, setEntries] = useState<Entry[]>([]);
  const [notice, setNotice] = useState("");

  const loadHome = async (userId: string) => {
    const { data, error } = await supabase
      .from("entries")
      .select(ENTRY_SELECT)
      .eq("published", true)
      .order("display_order", { ascending: true })
      .order("published_at", { ascending: false });
    if (error) throw error;
    const refreshedEntries = await enrichEntries((data ?? []) as Entry[]);
    setEntries(refreshedEntries);
    writeHomeCache(userId, refreshedEntries);
  };

  const refreshHome = async (userId: string, retry = false) => {
    try {
      await loadHome(userId);
    } catch (error) {
      if (!retry) {
        window.setTimeout(() => { void refreshHome(userId, true); }, 850);
        return;
      }
      setNotice(errorMessage(error));
    }
  };

  const activateUser = (activeUser: User, forceRefresh = false) => {
    setUser(activeUser);
    setAdmin(false);
    const cached = readHomeCache(activeUser.id);
    if (cached) setEntries(cached.entries);
    else setEntries([]);
    setLoading(false);
    void isAdmin().then(setAdmin);
    if (forceRefresh || !cached || Date.now() - cached.savedAt > HOME_CACHE_TTL) {
      void refreshHome(activeUser.id);
    }
  };

  const refreshSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const activeUser = session?.user ?? null;
    if (activeUser) {
      activateUser(activeUser);
      return;
    }
    setUser(null);
    setAdmin(false);
    setLoading(false);
  };

  useEffect(() => {
    void refreshSession().catch((error) => {
      setNotice(errorMessage(error));
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "SIGNED_IN" && session?.user) activateUser(session.user, true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setAdmin(false);
    setEntries([]);
    setScreen({ name: "home" });
  }

  async function openHome(message = "", refresh = false) {
    setNotice(message);
    if (refresh && user) await loadHome(user.id);
    setScreen({ name: "home" });
    window.scrollTo(0, 0);
  }

  function goBack() {
    setScreen((current) => {
      if (current.name === "entry") return { name: current.returnTo };
      if (current.name === "admin") return { name: "home" };
      if (current.name === "editor") return { name: "admin" };
      return current;
    });
  }

  useEffect(() => {
    if (!user || !Capacitor.isNativePlatform()) return;
    let listener: { remove: () => Promise<void> } | undefined;
    void NativeApp.addListener("backButton", () => {
      if (screen.name === "home") {
        void NativeApp.exitApp();
      } else {
        goBack();
      }
    }).then((registered) => { listener = registered; });
    return () => { void listener?.remove(); };
  }, [screen, user]);

  if (loading) return <main className="loading">STILL</main>;
  if (!user) return <Login onSignedIn={(activeUser) => activateUser(activeUser, true)} />;

  return (
    <main className="app-shell">
      <Header
        admin={admin}
        onHome={() => void openHome()}
        onAdmin={() => setScreen({ name: "admin" })}
        onSignOut={() => void signOut()}
      />
      {notice && <p className="notice">{notice}</p>}
      <div className="screen-stage" key={screen.name === "entry" ? "entry-" + screen.entry.id : screen.name}>
        {screen.name === "home" && (
          <Home
            entries={entries}
            onOpen={(entry) => setScreen({ name: "entry", entry, returnTo: "home" })}
            onRefresh={() => user ? loadHome(user.id) : Promise.resolve()}
          />
        )}
        {screen.name === "entry" && <EntryView entry={screen.entry} onBack={goBack} />}
        {screen.name === "admin" && admin && (
          <Admin
            onBack={() => setScreen({ name: "home" })}
            onCreate={() => setScreen({ name: "editor" })}
            onEdit={(entry) => setScreen({ name: "editor", entry })}
            onOpen={(entry) => setScreen({ name: "entry", entry, returnTo: "admin" })}
            onNotice={setNotice}
          />
        )}
        {screen.name === "editor" && admin && (
          <Editor
            entry={screen.entry}
            user={user}
            onCancel={() => setScreen({ name: "admin" })}
            onSaved={(message) => void openHome(message, true)}
          />
        )}
      </div>
    </main>
  );
}

function Header({ admin, onHome, onAdmin, onSignOut }: { admin: boolean; onHome: () => void; onAdmin: () => void; onSignOut: () => void }) {
  return <header className="topbar"><button className="brand" onClick={onHome}>STILL</button><nav>{admin && <button onClick={onAdmin}>管理</button>}<button onClick={onSignOut}>退出登录</button></nav></header>;
}

function Login({ onSignedIn }: { onSignedIn: (user: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const imageUrl = LOGIN_HERO_IMAGES[activeImage] ?? LOGIN_HERO_IMAGES[0];

  useEffect(() => {
    void loadSavedCredentials().then((saved) => {
      if (!saved) return;
      setEmail(saved.email);
      setPassword(saved.password);
      setRemember(true);
    });
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setPending(true); setMessage("");
    try {
      await setRememberLogin(remember);
      const normalizedEmail = email.trim();
      const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (error) setMessage("邮箱或密码不正确，请重试。");
      else if (!data.user) setMessage("登录状态未建立，请重试。");
      else {
        await saveSavedCredentials(remember, { email: normalizedEmail, password });
        onSignedIn(data.user);
      }
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="login">
      <section className="login-hero" aria-label="STILL 登录页图片">
        <button
          className="login-image-switch"
          type="button"
          aria-label="切换登录页图片"
          onClick={() => setActiveImage((current) => (current + 1) % LOGIN_HERO_IMAGES.length)}
        >
          <span className="login-image" style={{ backgroundImage: `url("${imageUrl}")` }} />
          <span className="login-image-shade" />
        </button>
        <p className="login-brand">STILL</p>
        <blockquote>“We keep what time would otherwise take away.”</blockquote>
        <div className="login-image-controls">
          <span>点击画面切换图片</span>
          <div aria-label={`第 ${activeImage + 1} 张，共 ${LOGIN_HERO_IMAGES.length} 张`} className="image-dots">
            {LOGIN_HERO_IMAGES.map((_, index) => <i className={index === activeImage ? "active" : ""} key={index} />)}
          </div>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-content">
          <p className="eyebrow">PRIVATE ACCESS</p>
          <h1>欢迎回来</h1>
          <p className="muted">这是一个私人图文空间。请使用受邀账号继续访问。</p>
          <form onSubmit={submit}>
            <label><span>邮箱 / EMAIL</span><input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label><span>密码 / PASSWORD</span><input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            <label className="remember-login"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /><span>记住账号与登录状态</span></label>
            {message && <p className="error">{message}</p>}
            {pending && <p className="login-status" aria-live="polite">正在打开档案…</p>}
            <button className="primary" disabled={pending}>{pending ? "正在进入…" : "进入档案"}<span>→</span></button>
          </form>
          <p className="login-help">未经授权无法创建账号。如需访问，请联系网站管理员。</p>
        </div>
      </section>
    </main>
  );
}

function Home({ entries, onOpen, onRefresh }: { entries: Entry[]; onOpen: (entry: Entry) => void; onRefresh: () => Promise<void> }) {
  const pullStart = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");

  function startPull(event: React.TouchEvent<HTMLElement>) {
    if (window.scrollY <= 0 && !refreshing) pullStart.current = event.touches[0]?.clientY ?? null;
  }

  function trackPull(event: React.TouchEvent<HTMLElement>) {
    if (pullStart.current === null || refreshing) return;
    const distance = (event.touches[0]?.clientY ?? pullStart.current) - pullStart.current;
    setPullDistance(Math.max(0, Math.min(82, distance * .42)));
  }

  async function finishPull() {
    const shouldRefresh = pullDistance >= 56 && !refreshing;
    pullStart.current = null;
    if (!shouldRefresh) return setPullDistance(0);
    setRefreshing(true);
    setRefreshError("");
    setPullDistance(56);
    try {
      await onRefresh();
    } catch (error) {
      setRefreshError(errorMessage(error));
    } finally {
      setRefreshing(false);
      setPullDistance(0);
    }
  }

  const refreshLabel = refreshing ? "正在更新…" : pullDistance >= 56 ? "松开刷新" : "下拉刷新";
  return <section className="page home-page" onTouchStart={startPull} onTouchMove={trackPull} onTouchEnd={() => void finishPull()} onTouchCancel={() => { pullStart.current = null; setPullDistance(0); }}><div className="pull-indicator" style={{ height: pullDistance }}><span>{refreshLabel}</span></div><section className="hero"><p className="eyebrow">PRIVATE ARCHIVE · {new Date().getFullYear()}</p><h1>Quiet things,<br /><span>carefully kept.</span></h1><p className="muted intro">这里收藏那些值得被慢慢看见的文字与影像。每一次访问，都保持私密。</p></section><div className="section-heading"><div><p className="eyebrow">JOURNAL</p><h2>最近收录</h2></div></div>{refreshError && <p className="error refresh-error">{refreshError}</p>}{entries.length === 0 ? <div className="empty">还没有公开的图文内容。</div> : <div className="entry-grid">{entries.map((entry) => <button className="entry-card" key={entry.id} onClick={() => onOpen(entry)}><div className="entry-media">{entry.images[0]?.signedUrl ? <img src={entry.images[0].signedUrl} alt="" /> : <div className="image-placeholder" />}{entry.images.length > 1 && <span className="photo-count">{entry.images.length} PHOTOS</span>}<span className="member-only">MEMBERS ONLY</span></div><div className="entry-card-copy"><p className="eyebrow">{formatDate(entry.published_at ?? entry.created_at)}</p><h3>{entry.title}</h3><p className="muted">{entry.summary}</p><p className="entry-author">BY {entry.author_email ?? "成员"}</p></div></button>)}</div>}</section>;
}

function EntryView({ entry, onBack }: { entry: Entry; onBack: () => void }) {
  useEffect(() => { window.scrollTo(0, 0); }, [entry.id]);
  return <article className="page detail"><button className="back" onClick={onBack}>← 返回</button><header><p className="eyebrow">JOURNAL · {formatDate(entry.published_at ?? entry.created_at)}</p><h1>{entry.title}</h1><p className="summary">{entry.summary}</p><p className="author">发布者 · {entry.author_email ?? "成员"}</p></header><div className="photos">{entry.images.map((image, index) => image.signedUrl && <figure key={image.id}><img src={image.signedUrl} alt={`${entry.title} 图片 ${index + 1}`} /><figcaption>{String(index + 1).padStart(2, "0")} / {String(entry.images.length).padStart(2, "0")}</figcaption></figure>)}</div><div className="body-copy">{entry.body.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></article>;
}

function Admin({ onBack, onCreate, onEdit, onOpen, onNotice }: { onBack: () => void; onCreate: () => void; onEdit: (entry: Entry) => void; onOpen: (entry: Entry) => void; onNotice: (value: string) => void }) {
  const [entries, setEntries] = useState<Entry[]>([]); const [loading, setLoading] = useState(true); const [notifyingId, setNotifyingId] = useState<string | null>(null);
  async function load() { setLoading(true); const { data, error } = await supabase.from("entries").select(ENTRY_SELECT).order("display_order", { ascending: true }).order("created_at", { ascending: false }); if (error) onNotice(error.message); else setEntries(await enrichEntries((data ?? []) as Entry[])); setLoading(false); }
  useEffect(() => { void load(); }, []);
  async function remove(entry: Entry) { if (!window.confirm(`删除“${entry.title}”？此操作不可撤销。`)) return; const paths = entry.images.map((image) => image.storage_path); const { error } = await supabase.from("entries").delete().eq("id", entry.id); if (error) return onNotice(error.message); if (paths.length) await supabase.storage.from("archive-images").remove(paths); await load(); onNotice("图文已删除。"); }
  async function move(index: number, direction: -1 | 1) { const target = index + direction; if (target < 0 || target >= entries.length) return; const reordered = [...entries]; [reordered[index], reordered[target]] = [reordered[target], reordered[index]]; for (const [position, entry] of reordered.entries()) { const { error } = await supabase.from("entries").update({ display_order: (position + 1) * 1000 }).eq("id", entry.id); if (error) return onNotice(error.message); } setEntries(reordered); }
  async function sendNotification(entry: Entry) { if (!window.confirm(`确定再次向所有成员发送“${entry.title}”的更新通知吗？`)) return; setNotifyingId(entry.id); try { onNotice(notificationMessage(await requestEntryNotification(entry.id, "manual"))); } catch (error) { onNotice(`通知发送失败：${errorMessage(error)}`); } finally { setNotifyingId(null); } }
  return <section className="page admin"><button className="back" onClick={onBack}>← 返回主页</button><div className="section-heading"><div><p className="eyebrow">ADMINISTRATION</p><h1>内容管理</h1></div><button className="primary compact" onClick={onCreate}>新建图文 <span>+</span></button></div>{loading ? <p className="muted">正在加载…</p> : <div className="admin-list">{entries.map((entry, index) => <article key={entry.id}><div className="admin-thumb">{entry.images[0]?.signedUrl && <img src={entry.images[0].signedUrl} alt="" />}</div><div className="admin-copy"><div><h2>{entry.title}</h2><span className={entry.published ? "badge live" : "badge"}>{entry.published ? "已发布" : "草稿"}</span></div><p className="muted">{entry.summary}</p></div><div className="admin-actions"><button disabled={!index} onClick={() => void move(index, -1)}>上移</button><button disabled={index === entries.length - 1} onClick={() => void move(index, 1)}>下移</button>{entry.published && <><button onClick={() => onOpen(entry)}>查看</button><button disabled={notifyingId === entry.id} onClick={() => void sendNotification(entry)}>{notifyingId === entry.id ? "发送中…" : "发送通知"}</button></>}<button onClick={() => onEdit(entry)}>编辑</button><button className="danger" onClick={() => void remove(entry)}>删除</button></div></article>)}</div>}</section>;
}

function Editor({ entry, user, onCancel, onSaved }: { entry?: Entry; user: User; onCancel: () => void; onSaved: (message: string) => void }) {
  const initial: EditorDraft = { title: entry?.title ?? "", slug: entry?.slug ?? "", summary: entry?.summary ?? "", body: entry?.body ?? "", published: entry?.published ?? true, images: (entry?.images ?? []).map((image) => ({ key: `old-${image.id}`, previewUrl: image.signedUrl ?? "", existing: image })) };
  const [draft, setDraft] = useState(initial); const [message, setMessage] = useState(""); const [saving, setSaving] = useState(false); const inputRef = useRef<HTMLInputElement>(null);
  const update = (field: keyof Omit<EditorDraft, "images">, value: string | boolean) => setDraft((current) => ({ ...current, [field]: value }));
  function appendFiles(files: File[]) { const room = MAX_IMAGES - draft.images.length; const accepted = files.slice(0, room).filter((file) => file.size <= MAX_FILE_BYTES && file.type.startsWith("image/")); if (!accepted.length) return setMessage("请选择不超过 10 MB 的图片。"); setDraft((current) => ({ ...current, images: [...current.images, ...accepted.map((file) => ({ key: crypto.randomUUID(), previewUrl: URL.createObjectURL(file), file }))] })); if (files.length > room) setMessage(`最多只能保留 ${MAX_IMAGES} 张图片。`); }
  async function takePhoto() { try { const photo = await Camera.takePhoto({ quality: 88, targetWidth: 2400, correctOrientation: true }); if (!photo.webPath) throw new Error("无法读取相机照片。"); const response = await fetch(photo.webPath); const blob = await response.blob(); appendFiles([new File([blob], `still-${Date.now()}.${extensionFrom("photo", blob.type)}`, { type: blob.type || "image/jpeg" })]); } catch (error) { if (!String(error).toLowerCase().includes("cancel")) setMessage(errorMessage(error)); } }
  async function chooseGallery() { try { const room = MAX_IMAGES - draft.images.length; if (!room) return setMessage(`最多只能保留 ${MAX_IMAGES} 张图片。`); if (!Capacitor.isNativePlatform()) return inputRef.current?.click(); const result = await Camera.chooseFromGallery({ mediaType: MediaTypeSelection.Photo, allowMultipleSelection: true, limit: room, quality: 88, targetWidth: 2400, correctOrientation: true }); const files = await Promise.all(result.results.map(async (image, index) => { const response = await fetch(image.webPath ?? image.uri!); const blob = await response.blob(); return new File([blob], `still-${Date.now()}-${index}.${extensionFrom("photo", blob.type)}`, { type: blob.type || "image/jpeg" }); })); appendFiles(files); } catch (error) { if (!String(error).toLowerCase().includes("cancel")) setMessage(errorMessage(error)); } }
  function removeImage(index: number) { setDraft((current) => { const image = current.images[index]; if (image.file) URL.revokeObjectURL(image.previewUrl); return { ...current, images: current.images.filter((_, position) => position !== index) }; }); }
  function moveImage(index: number, direction: -1 | 1) { setDraft((current) => { const target = index + direction; if (target < 0 || target >= current.images.length) return current; const images = [...current.images]; [images[index], images[target]] = [images[target], images[index]]; return { ...current, images }; }); }
  async function submit(event: React.FormEvent) { event.preventDefault(); setMessage(""); const fields = { title: draft.title.trim(), slug: draft.slug.trim().toLowerCase(), summary: draft.summary.trim(), body: draft.body.trim() }; if (!fields.title || !fields.summary || !fields.body || !draft.images.length) return setMessage("请完整填写内容，并至少保留一张图片。"); if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fields.slug)) return setMessage("网址标识仅能使用小写英文、数字和连字符。"); setSaving(true); const newPaths: string[] = []; try { const desired = []; for (const [position, image] of draft.images.entries()) { if (image.existing) { desired.push({ entry_id: entry?.id, storage_path: image.existing.storage_path, position, id: image.existing.id }); continue; } const file = image.file!; const path = `${user.id}/${crypto.randomUUID()}.${extensionFrom(file.name, file.type)}`; const { error } = await supabase.storage.from("archive-images").upload(path, file, { contentType: file.type, upsert: false }); if (error) throw error; newPaths.push(path); desired.push({ entry_id: entry?.id, storage_path: path, position }); }
      const now = new Date().toISOString(); let entryId = entry?.id; let becamePublished = false;
      if (!entry) { const { data, error } = await supabase.from("entries").insert({ ...fields, published: draft.published, published_at: draft.published ? now : null, image_path: desired[0].storage_path, author_id: user.id, author_email: user.email ?? null, display_order: await nextDisplayOrder() }).select("id").single(); if (error) throw error; entryId = data.id; const { error: imagesError } = await supabase.from("entry_images").insert(desired.map(({ storage_path, position }) => ({ entry_id: entryId, storage_path, position }))); if (imagesError) throw imagesError; }
      else { becamePublished = draft.published && !entry.published; const retained = new Set(desired.flatMap((image) => image.id ? [image.id] : [])); const removed = entry.images.filter((image) => !retained.has(image.id)); for (const image of desired.filter((item) => item.id)) { const { error } = await supabase.from("entry_images").update({ position: image.position }).eq("id", image.id!); if (error) throw error; } const insertRows = desired.filter((item) => !item.id).map(({ storage_path, position }) => ({ entry_id: entryId, storage_path, position })); if (insertRows.length) { const { error } = await supabase.from("entry_images").insert(insertRows); if (error) throw error; } if (removed.length) { const { error } = await supabase.from("entry_images").delete().in("id", removed.map((image) => image.id)); if (error) throw error; await supabase.storage.from("archive-images").remove(removed.map((image) => image.storage_path)); } const { error } = await supabase.from("entries").update({ ...fields, published: draft.published, image_path: desired[0].storage_path, published_at: draft.published ? (entry.published_at ?? now) : null, updated_at: now }).eq("id", entryId); if (error) throw error; }
      let notification = "";
      if ((draft.published && !entry) || becamePublished) {
        try { notification = ` ${notificationMessage(await requestEntryNotification(entryId!, "publish"))}`; }
        catch (error) { notification = ` 但更新邮件未发出：${errorMessage(error)}`; }
      }
      onSaved(`${entry ? "图文已保存。" : "图文已创建。"}${notification}`);
    } catch (error) { if (newPaths.length) await supabase.storage.from("archive-images").remove(newPaths); setMessage(errorMessage(error)); setSaving(false); } }
  return <section className="page editor"><button className="back" onClick={onCancel}>← 取消</button><header><p className="eyebrow">ADMINISTRATION</p><h1>{entry ? "编辑图文" : "新建图文"}</h1><p className="editor-intro">按顺序填写文字、照片和发布状态；保存前仍可自由调整。</p></header><form onSubmit={submit}><fieldset className="editor-section"><legend><span>01</span>基本信息</legend><p className="editor-section-note">这些内容会出现在首页列表与图文详情的开头。</p><div className="editor-field-grid"><label>标题<input required value={draft.title} onChange={(e) => update("title", e.target.value)} placeholder="例如：雨停之后" /></label><label>网址标识<small>只用小写英文、数字和连字符。</small><input required value={draft.slug} onChange={(e) => update("slug", e.target.value)} placeholder="after-the-rain" /></label></div><label className="editor-summary-field">摘要<small>用一两句话概括这篇图文的内容。</small><textarea required value={draft.summary} onChange={(e) => update("summary", e.target.value)} placeholder="写下这篇图文想留下的一句话。" /></label></fieldset><fieldset className="editor-section"><legend><span>02</span>正文与照片</legend><p className="editor-section-note">第一张照片会作为封面；可随时调整照片的顺序。</p><label>正文<small>段落之间空一行，阅读时会保留段落间距。</small><textarea className="tall" required value={draft.body} onChange={(e) => update("body", e.target.value)} placeholder="从这里开始写正文。" /></label><div className="picker"><div><strong>图文照片</strong><small>最多 10 张，每张不超过 10 MB</small></div><div className="picker-actions"><button type="button" onClick={() => void takePhoto()}>拍照</button><button type="button" onClick={() => void chooseGallery()}>从相册选择</button><input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={(event) => { appendFiles(Array.from(event.currentTarget.files ?? [])); event.currentTarget.value = ""; }} /></div></div>{draft.images.length > 0 && <div className="draft-images">{draft.images.map((image, index) => <article key={image.key}><img src={image.previewUrl} alt="" /><div><strong>{index === 0 ? "封面" : `图片 ${index + 1}`}</strong><div><button type="button" disabled={!index} onClick={() => moveImage(index, -1)}>前移</button><button type="button" disabled={index === draft.images.length - 1} onClick={() => moveImage(index, 1)}>后移</button><button type="button" className="danger" onClick={() => removeImage(index)}>移除</button></div></div></article>)}</div>}</fieldset><fieldset className="editor-section editor-publish-section"><legend><span>03</span>发布设置</legend><label className="publish-toggle"><input type="checkbox" checked={draft.published} onChange={(event) => update("published", event.target.checked)} /><span><strong>立即发布给所有成员</strong><small>关闭后会作为草稿保留，只有管理员能看见。</small></span></label></fieldset>{message && <p className="error">{message}</p>}<button className="primary" disabled={saving}>{saving ? "正在保存…" : entry ? "保存全部修改" : "创建并保存图文"}<span>→</span></button></form></section>;
}

async function nextDisplayOrder() { const { data } = await supabase.from("entries").select("display_order").order("display_order", { ascending: true }).limit(1).maybeSingle(); return typeof data?.display_order === "number" ? data.display_order - 1000 : 0; }
