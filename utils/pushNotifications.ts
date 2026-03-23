import webpush from "web-push";
import { createAdminClient } from "@/utils/supabase/admin";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:contacto@aphellium.com";

let vapidConfigured = false;
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  vapidConfigured = true;
}

interface PushPayload {
  title: string;
  body: string;
  type?: "call" | "message" | "chat" | "support" | "general";
  url?: string;
  tag?: string;
  meetingSlug?: string;
}

/**
 * Send a push notification to a specific user (all their devices).
 * Fails silently if VAPID keys are not configured.
 */
export async function sendPushToUser(
  targetUserId: string,
  payload: PushPayload
): Promise<{ sent: number }> {
  if (!vapidConfigured) return { sent: 0 };

  const admin = createAdminClient();
  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("endpoint, keys_p256dh, keys_auth")
    .eq("user_id", targetUserId);

  if (!subscriptions || subscriptions.length === 0) return { sent: 0 };

  const notifPayload = JSON.stringify(payload);
  let sent = 0;
  const staleEndpoints: string[] = [];

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
        },
        notifPayload,
        { TTL: 60 * 60 }
      );
      sent++;
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 410 || statusCode === 404) {
        staleEndpoints.push(sub.endpoint);
      }
    }
  }

  if (staleEndpoints.length > 0) {
    await admin
      .from("push_subscriptions")
      .delete()
      .eq("user_id", targetUserId)
      .in("endpoint", staleEndpoints);
  }

  return { sent };
}

/**
 * Send push notification to multiple users at once.
 */
export async function sendPushToUsers(
  targetUserIds: string[],
  payload: PushPayload
): Promise<{ totalSent: number }> {
  let totalSent = 0;
  for (const userId of targetUserIds) {
    const { sent } = await sendPushToUser(userId, payload);
    totalSent += sent;
  }
  return { totalSent };
}
