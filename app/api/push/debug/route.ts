import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const vapidPublic = !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = !!process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = !!process.env.VAPID_SUBJECT;

  const admin = createAdminClient();
  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("endpoint, updated_at")
    .eq("user_id", user.id);

  return NextResponse.json({
    userId: user.id,
    vapid: { public: vapidPublic, private: vapidPrivate, subject: vapidSubject },
    subscriptions: error ? { error: error.message } : (subs || []).map(s => ({
      endpoint: s.endpoint?.slice(0, 60) + "…",
      updated_at: s.updated_at,
    })),
    subscriptionCount: subs?.length ?? 0,
  });
}
