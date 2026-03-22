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

  const peerId = body.peerId;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof peerId !== "string" || !uuidRegex.test(peerId)) {
    return NextResponse.json({ error: "peerId inválido" }, { status: 400 });
  }

  // Prevent calling yourself
  if (peerId === user.id) {
    return NextResponse.json({ error: "No puedes llamarte a ti mismo" }, { status: 400 });
  }

  const recentCutoff = new Date(Date.now() - 60 * 1000).toISOString();

  // --- Check for existing recent direct call between these two users ---
  // Query 1: Current user is host, peer was invited
  const { data: myHostedInv } = await supabase
    .from("meeting_invitations")
    .select("id, status, user_id, meetings!inner(id, slug, host_id, status, is_locked, max_participants, created_at)")
    .eq("user_id", peerId)
    .eq("meetings.host_id", user.id)
    .in("meetings.status", ["planned", "active"])
    .eq("meetings.is_locked", true)
    .eq("meetings.max_participants", 2)
    .gte("meetings.created_at", recentCutoff)
    .limit(1)
    .maybeSingle();

  if (myHostedInv) {
    if (myHostedInv.status === "declined") {
      await supabase.from("meeting_invitations").update({ status: "pending" }).eq("id", myHostedInv.id);
    }
    const m = myHostedInv.meetings as unknown as { slug: string };
    return NextResponse.json({ slug: m.slug });
  }

  // Query 2: Peer is host, current user was invited
  const { data: peerHostedInv } = await supabase
    .from("meeting_invitations")
    .select("id, status, user_id, meetings!inner(id, slug, host_id, status, is_locked, max_participants, created_at)")
    .eq("user_id", user.id)
    .eq("meetings.host_id", peerId)
    .in("meetings.status", ["planned", "active"])
    .eq("meetings.is_locked", true)
    .eq("meetings.max_participants", 2)
    .gte("meetings.created_at", recentCutoff)
    .limit(1)
    .maybeSingle();

  if (peerHostedInv) {
    if (peerHostedInv.status !== "accepted") {
      await supabase.from("meeting_invitations").update({ status: "accepted" }).eq("id", peerHostedInv.id);
    }
    const m = peerHostedInv.meetings as unknown as { slug: string };
    return NextResponse.json({ slug: m.slug });
  }

  // --- No existing meeting — create a new one ---
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", peerId)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const peerName = profile.full_name || "Usuario";

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

  const { error: invError } = await supabase.from("meeting_invitations").insert({
    meeting_id: meeting.id,
    user_id: peerId,
    invited_by: user.id,
    status: "pending",
  });

  if (invError) {
    // Cleanup orphaned meeting
    await supabase.from("meetings").delete().eq("id", meeting.id);
    return NextResponse.json({ error: "Error al invitar al usuario" }, { status: 500 });
  }

  return NextResponse.json({ slug: meeting.slug });
}
