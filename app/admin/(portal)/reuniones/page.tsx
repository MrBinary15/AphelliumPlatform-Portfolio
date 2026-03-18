import { createClient } from "@/utils/supabase/server";
import { getAuthUser } from "@/utils/auth";
import { redirect } from "next/navigation";
import ReunionesClient from "@/app/admin/(portal)/reuniones/ReunionesClient";

export default async function ReunionesPage() {
  const auth = await getAuthUser();
  if (!auth) redirect("/admin/login");

  const supabase = await createClient();

  const { data: meetings } = await supabase
    .from("meetings")
    .select("*")
    .or(`host_id.eq.${auth.user.id},co_host_id.eq.${auth.user.id}`)
    .order("created_at", { ascending: false });

  const { data: invitations } = await supabase
    .from("meeting_invitations")
    .select("*, meetings(*)")
    .eq("user_id", auth.user.id)
    .eq("status", "pending");

  const { data: participatingRaw } = await supabase
    .from("meeting_participants")
    .select("meeting_id, meetings(*)")
    .eq("user_id", auth.user.id);

  // Supabase may return meetings as array or object; normalize to single object
  const participatingIn = (participatingRaw || []).map((p: Record<string, unknown>) => ({
    meeting_id: p.meeting_id as string,
    meetings: Array.isArray(p.meetings) ? p.meetings[0] : p.meetings,
  })).filter((p: Record<string, unknown>) => p.meetings);

  const { data: teamMembers } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role")
    .neq("id", auth.user.id);

  return (
    <ReunionesClient
      initialMeetings={meetings || []}
      invitations={invitations || []}
      participatingIn={participatingIn || []}
      teamMembers={teamMembers || []}
      currentUserId={auth.user.id}
    />
  );
}
