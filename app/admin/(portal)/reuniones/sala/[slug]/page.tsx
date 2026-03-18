import { createClient } from "@/utils/supabase/server";
import { getAuthUser } from "@/utils/auth";
import { redirect } from "next/navigation";
import VideoRoomClient from "@/app/admin/(portal)/reuniones/sala/[slug]/VideoRoomClient";

export default async function SalaPage({ params }: { params: Promise<{ slug: string }> }) {
  const auth = await getAuthUser();
  if (!auth) redirect("/admin/login");

  const { slug } = await params;
  const supabase = await createClient();

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, slug, title, host_id, status")
    .eq("slug", slug)
    .single();

  if (!meeting) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Reunion no encontrada</h2>
          <p className="text-gray-400 text-sm">El enlace puede ser incorrecto o la reunion fue eliminada.</p>
        </div>
      </div>
    );
  }

  if (meeting.status === "finished" || meeting.status === "cancelled") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Esta reunion ha finalizado</h2>
          <p className="text-gray-400 text-sm">La reunion ha terminado.</p>
        </div>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", auth.user.id)
    .single();

  return (
    <VideoRoomClient
      meeting={meeting}
      currentUserId={auth.user.id}
      currentUserName={profile?.full_name || auth.user.email || "Usuario"}
    />
  );
}
