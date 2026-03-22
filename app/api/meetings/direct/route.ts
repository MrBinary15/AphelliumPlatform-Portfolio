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

  // Prevent calling yourself
  if (peerId === user.id) {
    return NextResponse.json({ error: "No puedes llamarte a ti mismo" }, { status: 400 });
  }

  const recentCutoff = new Date(Date.now() - 60 * 1000).toISOString();

  // --- Single query: find existing direct call between these two users ---
  // Uses meeting_invitations JOIN to avoid N+1 loops
  const { data: existingInv } = await supabase
    .from("meeting_invitations")
    .select("id, status, meeting_id, user_id, meetings!inner(id, slug, host_id, status, is_locked, max_participants, created_at)")
    .or(`and(user_id.eq.${peerId},meetings.host_id.eq.${user.id}),and(user_id.eq.${user.id},meetings.host_id.eq.${peerId})`)
    .in("meetings.status", ["planned", "active"])
    .eq("meetings.is_locked", true)
    .eq("meetings.max_participants", 2)
    .gte("meetings.created_at", recentCutoff)
    .order("created_at", { ascending: false, referencedTable: "meetings" })
    .limit(1)
    .maybeSingle();

  if (existingInv) {
    const inv = existingInv;
    const meetingData = inv.meetings as unknown as { slug: string; host_id: string };

    // Re-activate declined invitations
    if (inv.status === "declined") {
      await supabase.from("meeting_invitations").update({ status: "pending" }).eq("id", inv.id);
    }
    // Auto-accept if peer hosted and current user was invited
    if (meetingData.host_id === peerId && inv.user_id === user.id && inv.status !== "accepted") {
      await supabase.from("meeting_invitations").update({ status: "accepted" }).eq("id", inv.id);
    }

    return NextResponse.json({ slug: meetingData.slug });
  }

  // --- No existing meeting — create a new one ---
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", peerId)
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

  await supabase.from("meeting_invitations").insert({
    meeting_id: meeting.id,
    user_id: peerId,
    invited_by: user.id,
    status: "pending",
  });

  return NextResponse.json({ slug: meeting.slug });
}
