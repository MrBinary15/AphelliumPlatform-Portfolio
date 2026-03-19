import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { peerId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  if (!body.peerId) {
    return NextResponse.json({ error: "peerId es requerido" }, { status: 400 });
  }

  // Create a new meeting for this direct call
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", body.peerId)
    .single();

  const peerName = profile?.full_name || "Usuario";

  const { data: meeting, error } = await supabase
    .from("meetings")
    .insert({
      title: `Llamada con ${peerName}`,
      host_id: user.id,
      status: "planned",
      is_locked: true,
      max_participants: 2,
    })
    .select("id, slug")
    .single();

  if (error || !meeting) {
    return NextResponse.json({ error: error?.message ?? "Error al crear reunión" }, { status: 500 });
  }

  // Notify the peer with a meeting invitation so ChatWidget shows the incoming call popup
  await supabase.from("meeting_invitations").insert({
    meeting_id: meeting.id,
    user_id: body.peerId,
    invited_by: user.id,
    status: "pending",
  });

  return NextResponse.json({ slug: meeting.slug });
}
