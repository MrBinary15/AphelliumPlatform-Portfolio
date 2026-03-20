import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Check role
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "coordinador")) {
    return NextResponse.json({ error: "Sin permisos para eliminar" }, { status: 403 });
  }

  // Delete messages first, then conversation
  await admin
    .from("support_messages")
    .delete()
    .eq("conversation_id", id);

  const { error } = await admin
    .from("support_conversations")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "No se pudo eliminar la conversación" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
