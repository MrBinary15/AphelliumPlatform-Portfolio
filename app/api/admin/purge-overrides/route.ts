import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest) {
  // Auth check — only admins
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  // Delete ALL inline_edit: entries from site_settings
  const { data, error: fetchErr } = await admin
    .from("site_settings")
    .select("key")
    .like("key", "inline_edit:%");

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ deleted: 0 });
  }

  const keys = data.map((r) => String(r.key));
  const { error: delErr } = await admin
    .from("site_settings")
    .delete()
    .in("key", keys);

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: keys.length, keys });
}
