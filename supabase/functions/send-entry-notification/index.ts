import { createClient } from "npm:@supabase/supabase-js@2.57.4";

type NotificationReason = "publish" | "manual";

type RequestBody = {
  entryId?: string;
  reason?: NotificationReason;
};

type Recipient = {
  id: string;
  email: string;
};

const JSON_HEADERS = { "Content-Type": "application/json" };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function emailHtml({
  title,
  summary,
  url,
}: {
  title: string;
  summary: string;
  url: string;
}) {
  return `<!doctype html>
<html lang="zh-CN">
  <body style="margin:0;background:#f2f0eb;color:#171714;font-family:'Helvetica Neue','PingFang SC',Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f0eb;padding:40px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;border-top:1px solid rgba(23,23,20,.22);">
          <tr><td style="padding:28px 0 44px;font-family:Georgia,'Songti SC',serif;font-size:28px;letter-spacing:-.02em;">STILL</td></tr>
          <tr><td style="padding-bottom:16px;font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:#77756f;">New archive entry</td></tr>
          <tr><td style="padding-bottom:18px;font-family:Georgia,'Songti SC',serif;font-size:42px;line-height:1.15;">${escapeHtml(title)}</td></tr>
          <tr><td style="padding-bottom:12px;font-size:14px;line-height:1.8;color:#77756f;">你好。</td></tr>
          <tr><td style="padding-bottom:32px;font-size:15px;line-height:1.9;color:#57554f;">${escapeHtml(summary)}</td></tr>
          <tr><td>
            <a href="${escapeHtml(url)}" style="display:inline-block;background:#171714;color:#f2f0eb;padding:16px 24px;text-decoration:none;font-size:12px;letter-spacing:.16em;text-transform:uppercase;">Enter archive&nbsp;&nbsp;→</a>
          </td></tr>
          <tr><td style="padding-top:44px;font-size:11px;line-height:1.7;color:#929089;border-bottom:1px solid rgba(23,23,20,.22);padding-bottom:28px;">这封邮件仅用于通知 STILL 私人空间的内容更新。打开内容仍需登录。</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const notificationFrom = Deno.env.get("NOTIFICATION_FROM");
  const appUrl = Deno.env.get("APP_URL");
  const authorization = request.headers.get("Authorization");

  if (
    !supabaseUrl ||
    !publishableKey ||
    !serviceRoleKey ||
    !resendApiKey ||
    !notificationFrom ||
    !appUrl
  ) {
    return json({ error: "Notification service is not configured" }, 500);
  }
  if (!authorization?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const token = authorization.slice("Bearer ".length);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);
  if (userError || !user) return json({ error: "Unauthorized" }, 401);

  const { data: admin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError || admin !== true) return json({ error: "Forbidden" }, 403);

  let payload: RequestBody;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const reason = payload.reason === "manual" ? "manual" : "publish";
  if (!payload.entryId) return json({ error: "entryId is required" }, 400);

  const { data: entry, error: entryError } = await supabase
    .from("entries")
    .select("id,slug,title,summary,published")
    .eq("id", payload.entryId)
    .single();
  if (entryError || !entry) return json({ error: "Entry not found" }, 404);
  if (!entry.published) return json({ error: "Draft entries cannot be announced" }, 400);

  const { data: userPage, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (usersError) return json({ error: usersError.message }, 500);

  const recipients = userPage.users
    .filter((member): member is typeof member & { email: string } => Boolean(member.email))
    .map((member) => ({ id: member.id, email: member.email })) as Recipient[];
  const requestId = crypto.randomUUID();
  const url = `${appUrl.replace(/\/$/, "")}/entry/${encodeURIComponent(entry.slug)}`;
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const [index, recipient] of recipients.entries()) {
    const idempotencyKey =
      reason === "publish"
        ? `publish/${entry.id}/${recipient.id}`
        : `manual/${entry.id}/${requestId}/${recipient.id}`;

    if (reason === "publish") {
      const { data: previous } = await supabase
        .from("notification_deliveries")
        .select("id,status")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (previous?.status === "sent") {
        skipped += 1;
        continue;
      }
    }

    const { data: delivery, error: deliveryError } = await supabase
      .from("notification_deliveries")
      .upsert(
        {
          entry_id: entry.id,
          recipient_user_id: recipient.id,
          recipient_email: recipient.email,
          reason,
          idempotency_key: idempotencyKey,
          status: "pending",
          error_message: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "idempotency_key" },
      )
      .select("id,attempt_count")
      .single();

    if (deliveryError || !delivery) {
      failed += 1;
      continue;
    }

    await supabase
      .from("notification_deliveries")
      .update({ attempt_count: delivery.attempt_count + 1 })
      .eq("id", delivery.id);

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          from: notificationFrom,
          to: [recipient.email],
          subject: `STILL · ${entry.title}`,
          html: emailHtml({
            title: entry.title,
            summary: entry.summary,
            url,
          }),
          text: `${entry.title}\n\n${entry.summary}\n\n登录查看：${url}`,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message ?? result?.error ?? "Resend rejected the message");
      }

      await supabase
        .from("notification_deliveries")
        .update({
          status: "sent",
          provider_message_id: result.id ?? null,
          error_message: null,
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", delivery.id);
      sent += 1;
    } catch (error) {
      await supabase
        .from("notification_deliveries")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
          updated_at: new Date().toISOString(),
        })
        .eq("id", delivery.id);
      failed += 1;
    }

    if (index < recipients.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 550));
    }
  }

  return json({ total: recipients.length, sent, failed, skipped });
});
