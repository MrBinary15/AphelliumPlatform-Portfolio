import { createClient } from "@/utils/supabase/server";
import { getAuthUser } from "@/utils/auth";
import { redirect } from "next/navigation";
import VideoRoomClient from "@/app/admin/(portal)/reuniones/sala/[slug]/VideoRoomClient";
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Reunión no encontrada</h2>
          <p className="text-gray-400 text-sm">El enlace puede ser incorrecto o la reunión fue eliminada.</p>
        </div>
      </div>
    );
  }

  if (meeting.status === "finished" || meeting.status === "cancelled") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Esta reunión ha finalizado</h2>
          <p className="text-gray-400 text-sm">La reunión ya terminó o fue cancelada.</p>
        </div>
      </div>
    );
  }

  // Check if meeting is locked and user is not host/co-host/existing participant
  if (meeting.is_locked) {
    const isHostOrCoHost =
      meeting.host_id === auth.user.id || meeting.co_host_id === auth.user.id;

    if (!isHostOrCoHost) {
      const { data: participant } = await supabase
        .from("meeting_participants")
        .select("id")
        .eq("meeting_id", meeting.id)
        .eq("user_id", auth.user.id)
        .maybeSingle();

      if (!participant) {
        // Also check invitations
        const { data: invitation } = await supabase
          .from("meeting_invitations")
          .select("id")
          .eq("meeting_id", meeting.id)
          .eq("user_id", auth.user.id)
          .in("status", ["accepted", "pending"])
          .maybeSingle();

        if (!invitation) {
          return (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <Lock className="text-red-400" size={28} />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Sala privada</h2>
                <p className="text-gray-400 text-sm">Esta reunión está bloqueada y no tienes acceso.<br />Contacta al anfitrión para que te invite.</p>
              </div>
            </div>
          );
        }
      }
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", auth.user.id)
    .single();

  return (
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
}
