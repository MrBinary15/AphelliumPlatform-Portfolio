import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getAuthUser } from "@/utils/auth";
import { redirect } from "next/navigation";
import VideoRoomClient from "@/app/admin/(portal)/reuniones/sala/[slug]/VideoRoomClient";
import AccessCodeGate from "@/app/admin/(portal)/reuniones/sala/[slug]/AccessCodeGate";
import JoinApprovalGate from "@/app/admin/(portal)/reuniones/sala/[slug]/JoinApprovalGate";
import { Lock } from "lucide-react";

export default async function SalaPage({ params }: { params: Promise<{ slug: string }> }) {
  const auth = await getAuthUser();
  if (!auth) redirect("/admin/login");

  const { slug } = await params;
  const supabase = await createClient();

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, slug, title, host_id, co_host_id, status, is_locked, max_participants, settings")
    .eq("slug", slug)
    .single();

  if (!meeting) {
    return (
      <div className="relative flex items-center justify-center min-h-[60vh] overflow-hidden">
        <div className="meeting-orb w-64 h-64 bg-red-500/5 -top-20 -right-20" />
        <div className="text-center animate-fade-in-up">
          <div className="mx-auto mb-5 w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-500/10 to-gray-600/5 border border-gray-500/15 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M8 11h6" strokeLinecap="round"/></svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Reunión no encontrada</h2>
          <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">El enlace puede ser incorrecto o la reunión fue eliminada.</p>
          <a href="/admin/reuniones" className="btn-premium inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-all">Volver a reuniones</a>
        </div>
      </div>
    );
  }

  if (meeting.status === "finished" || meeting.status === "cancelled") {
    return (
      <div className="relative flex items-center justify-center min-h-[60vh] overflow-hidden">
        <div className="meeting-orb w-56 h-56 bg-amber-500/5 -bottom-16 -left-16" />
        <div className="text-center animate-fade-in-up">
          <div className="mx-auto mb-5 w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/15 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber-400"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Reunión finalizada</h2>
          <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">La reunión ya terminó o fue cancelada.</p>
          <a href="/admin/reuniones" className="btn-premium inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-all">Volver a reuniones</a>
        </div>
      </div>
    );
  }

  const isHostOrCoHost = meeting.host_id === auth.user.id || meeting.co_host_id === auth.user.id;
  const requireHostApproval = !!meeting.settings?.require_host_approval;

  let hasParticipantAccess = false;
  if (!isHostOrCoHost) {
    const [{ data: participant }, { data: invitation }] = await Promise.all([
      supabase
        .from("meeting_participants")
        .select("id")
        .eq("meeting_id", meeting.id)
        .eq("user_id", auth.user.id)
        .maybeSingle(),
      supabase
        .from("meeting_invitations")
        .select("id")
        .eq("meeting_id", meeting.id)
        .eq("user_id", auth.user.id)
        .eq("status", "accepted")
        .maybeSingle(),
    ]);
    hasParticipantAccess = !!participant || !!invitation;

    if (meeting.is_locked && !hasParticipantAccess) {
      return (
        <div className="relative flex items-center justify-center min-h-[60vh] overflow-hidden">
          <div className="meeting-orb w-72 h-72 bg-red-500/5 -top-20 -right-20" />
          <div className="meeting-orb w-48 h-48 bg-purple-500/4 -bottom-10 -left-10" style={{ animationDelay: "-5s" }} />
          <div className="text-center animate-fade-in-up">
            <div className="relative mx-auto mb-5 w-20 h-20">
              <div className="absolute inset-0 rounded-2xl border-2 border-red-500/15" style={{ animation: "ripple 3s ease-out infinite" }} />
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500/15 to-red-600/8 border border-red-500/25 flex items-center justify-center">
                <Lock className="text-red-400" size={32} />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Sala privada</h2>
            <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto leading-relaxed">Esta reunión está bloqueada y no tienes acceso.<br />Contacta al anfitrión para que te invite.</p>
            <a href="/admin/reuniones" className="btn-premium inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-all">Volver a reuniones</a>
          </div>
        </div>
      );
    }
  }

  // Check if access code is required (use admin client to read access_code column securely)
  let needsCode = false;
  let meetingAccessCode: string | null = null;
  if (!isHostOrCoHost) {
    const admin = createAdminClient();
    const { data: codeRow } = await admin
      .from("meetings")
      .select("access_code")
      .eq("id", meeting.id)
      .single();
    if (codeRow?.access_code) {
      needsCode = true;
      meetingAccessCode = codeRow.access_code;
    }
  } else {
    const admin = createAdminClient();
    const { data: codeRow } = await admin
      .from("meetings")
      .select("access_code")
      .eq("id", meeting.id)
      .single();
    meetingAccessCode = codeRow?.access_code ?? null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", auth.user.id)
    .single();

  const videoRoom = (
    <VideoRoomClient
      meeting={{
        id: meeting.id,
        slug: meeting.slug,
        title: meeting.title,
        host_id: meeting.host_id,
        co_host_id: meeting.co_host_id,
        status: meeting.status,
        is_locked: meeting.is_locked ?? false,
        max_participants: meeting.max_participants ?? null,
        access_code: meetingAccessCode,
        settings: meeting.settings ?? {
          allow_chat: true,
          allow_screen_share: true,
          allow_hand_raise: true,
          mute_on_join: false,
          camera_off_on_join: false,
        },
      }}
      currentUserId={auth.user.id}
      currentUserName={profile?.full_name || auth.user.email || "Usuario"}
      currentUserAvatar={profile?.avatar_url || null}
    />
  );

  if (needsCode) {
    return (
      <AccessCodeGate meetingId={meeting.id} meetingTitle={meeting.title}>
        {requireHostApproval && !isHostOrCoHost && !hasParticipantAccess ? (
          <JoinApprovalGate meetingId={meeting.id} meetingTitle={meeting.title}>
            {videoRoom}
          </JoinApprovalGate>
        ) : videoRoom}
      </AccessCodeGate>
    );
  }

  if (requireHostApproval && !isHostOrCoHost && !hasParticipantAccess) {
    return (
      <JoinApprovalGate meetingId={meeting.id} meetingTitle={meeting.title}>
        {videoRoom}
      </JoinApprovalGate>
    );
  }

  return videoRoom;
}
