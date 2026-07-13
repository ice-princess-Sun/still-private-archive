import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationReason = "publish" | "manual";
export type NotificationOutcome = "sent" | "partial" | "empty" | "failed";

export type NotificationResult = {
  outcome: NotificationOutcome;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
};

export async function requestEntryNotification(
  supabase: SupabaseClient,
  entryId: string,
  reason: NotificationReason,
): Promise<NotificationResult> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "send-entry-notification",
      { body: { entryId, reason } },
    );

    if (error) {
      return { outcome: "failed", total: 0, sent: 0, failed: 1, skipped: 0 };
    }

    const total = Number(data?.total ?? 0);
    const sent = Number(data?.sent ?? 0);
    const failed = Number(data?.failed ?? 0);
    const skipped = Number(data?.skipped ?? 0);
    const outcome: NotificationOutcome =
      total === 0 ? "empty" : failed > 0 ? "partial" : "sent";

    return { outcome, total, sent, failed, skipped };
  } catch {
    return { outcome: "failed", total: 0, sent: 0, failed: 1, skipped: 0 };
  }
}
