import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

// GET: Fetch user's notifications (paginated)
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "30"), 100);
  const offset = parseInt(url.searchParams.get("offset") || "0");
  const unreadOnly = url.searchParams.get("unread") === "1";

  let query = supabase
    .from("notifications")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (unreadOnly) query = query.eq("read", false);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also get unread count
  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("read", false);

  return NextResponse.json({ notifications: data || [], total: count || 0, unread: unreadCount || 0 });
}

// PATCH: Mark notifications as read
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let body: { ids?: string[]; all?: boolean };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Body inválido" }, { status: 400 }); }

  if (body.all) {
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
  } else if (body.ids?.length) {
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).in("id", body.ids);
  }

  return NextResponse.json({ success: true });
}

// DELETE: Delete notifications
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let body: { ids?: string[]; all?: boolean };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Body inválido" }, { status: 400 }); }

  if (body.all) {
    await supabase.from("notifications").delete().eq("user_id", user.id);
  } else if (body.ids?.length) {
    await supabase.from("notifications").delete().eq("user_id", user.id).in("id", body.ids);
  }

  return NextResponse.json({ success: true });
}
