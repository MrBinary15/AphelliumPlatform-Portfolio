import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { normalizeRole } from "@/utils/roles";

export async function POST(request: Request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = normalizeRole(profile?.role);
  if (role !== "admin" && role !== "coordinador") {
    return NextResponse.json({ error: "No tienes permisos para crear grupos" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const memberIdsRaw = Array.isArray(body?.memberIds) ? body.memberIds : [];
  const memberIds = memberIdsRaw.filter((x: unknown): x is string => typeof x === "string" && x.length > 0);

  if (!name) {
    return NextResponse.json({ error: "Nombre de grupo requerido" }, { status: 400 });
  }

  const { data: room, error: roomError } = await admin
    .from("chat_rooms")
    .insert({
      name,
      room_type: "manual",
      created_by: user.id,
    })
    .select("id, name, room_type, task_id")
    .single();

  if (roomError || !room) {
    return NextResponse.json({ error: roomError?.message || "No se pudo crear el grupo" }, { status: 500 });
  }

  const uniqueMembers = Array.from(new Set([user.id, ...memberIds]));
  const { error: memberError } = await admin
    .from("chat_room_members")
    .upsert(
      uniqueMembers.map((memberId) => ({
        room_id: room.id,
        user_id: memberId,
        added_by: user.id,
      })),
      { onConflict: "room_id,user_id" }
    );

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  return NextResponse.json({ room });
}
