import { createAdminClient } from "@/utils/supabase/admin";
import { sendPushToUser, sendPushToUsers } from "@/utils/pushNotifications";

type NotifType = "task" | "meeting" | "message" | "noticia" | "proyecto" | "general";

interface CreateNotificationOptions {
  userId: string;
  type: NotifType;
  title: string;
  body?: string;
  url?: string;
  pushNotify?: boolean; // default true
}

/**
 * Create an in-app notification AND send push notification.
 * Designed to be called server-side from actions / API routes.
 */
export async function createNotification({
  userId,
  type,
  title,
  body,
  url,
  pushNotify = true,
}: CreateNotificationOptions) {
  const admin = createAdminClient();

  // Insert in-app notification
  const { error } = await admin.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body: body || null,
    url: url || null,
  });

  if (error) {
    console.error("[Notify] Insert error:", error.message);
  }

  // Send push notification (fire-and-forget)
  if (pushNotify) {
    sendPushToUser(userId, {
      title,
      body: body || "",
      type: type === "meeting" ? "call" : type === "message" ? "message" : "general",
      url: url || "/admin/notificaciones",
      tag: `${type}-${Date.now()}`,
    }).catch(() => {});
  }
}

/**
 * Notify multiple users at once (in-app + push).
 * Useful for broadcasting (new noticia, new proyecto, etc).
 */
export async function notifyUsers(
  userIds: string[],
  opts: Omit<CreateNotificationOptions, "userId">
) {
  if (userIds.length === 0) return;

  const admin = createAdminClient();

  // Batch insert in-app notifications
  const rows = userIds.map((uid) => ({
    user_id: uid,
    type: opts.type,
    title: opts.title,
    body: opts.body || null,
    url: opts.url || null,
  }));

  const { error } = await admin.from("notifications").insert(rows);
  if (error) console.error("[Notify] Batch insert error:", error.message);

  // Push to all
  if (opts.pushNotify !== false) {
    sendPushToUsers(userIds, {
      title: opts.title,
      body: opts.body || "",
      type: opts.type === "meeting" ? "call" : opts.type === "message" ? "message" : "general",
      url: opts.url || "/admin/notificaciones",
      tag: `${opts.type}-${Date.now()}`,
    }).catch(() => {});
  }
}

/**
 * Get all user IDs with a given set of roles.
 * Used to determine who should be notified of public events.
 */
export async function getUserIdsByRoles(roles: string[]): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .in("role", roles);
  return (data || []).map((p) => p.id);
}

/**
 * Get all team members (everyone except the sender).
 */
export async function getTeamUserIds(excludeUserId?: string): Promise<string[]> {
  const admin = createAdminClient();
  let query = admin.from("profiles").select("id").in("role", ["admin", "coordinador", "editor", "viewer"]);
  if (excludeUserId) query = query.neq("id", excludeUserId);
  const { data } = await query;
  return (data || []).map((p) => p.id);
}
