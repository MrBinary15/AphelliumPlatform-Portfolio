import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import webpush from "web-push";

export const dynamic = "force-dynamic";

// Configure VAPID keys (set in environment variables)
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:contacto@aphellium.com";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

interface SendPayload {
  targetUserId: string;
  title: string;
  body: string;
  type?: "call" | "message" | "chat" | "support" | "general";
  url?: string;
  tag?: string;
  meetingSlug?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Auth: only admins/coordinators or internal calls
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check role
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "coordinador"].includes(profile.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
    }

    const payload: SendPayload = await request.json();
    const { targetUserId, title, body, type, url, tag, meetingSlug } = payload;

    if (!targetUserId || !title) {
      return NextResponse.json({ error: "Missing targetUserId or title" }, { status: 400 });
    }

    // Get all push subscriptions for this user
    const { data: subscriptions } = await admin
      .from("push_subscriptions")
      .select("endpoint, keys_p256dh, keys_auth")
      .eq("user_id", targetUserId);

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ sent: 0, reason: "No subscriptions" });
    }

    const notifPayload = JSON.stringify({
      title,
      body,
      type: type || "general",
      url: url || "/",
      tag,
      meetingSlug,
    });

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
          { TTL: 60 * 60 } // 1 hour TTL
        );
        sent++;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 410 || statusCode === 404) {
          // Subscription expired, mark for cleanup
          staleEndpoints.push(sub.endpoint);
        }
      }
    }

    // Clean up stale subscriptions
    if (staleEndpoints.length > 0) {
      await admin
        .from("push_subscriptions")
        .delete()
        .eq("user_id", targetUserId)
        .in("endpoint", staleEndpoints);
    }

    return NextResponse.json({ sent, total: subscriptions.length, cleaned: staleEndpoints.length });
  } catch (err) {
    console.error("Push send error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
