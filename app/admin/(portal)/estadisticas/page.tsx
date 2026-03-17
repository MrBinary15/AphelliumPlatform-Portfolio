import { createClient } from "@/utils/supabase/server";
import { getAuthUser } from "@/utils/auth";
import { hasPermission } from "@/utils/roles";
import { redirect } from "next/navigation";
import EstadisticasClient from "./EstadisticasClient";

export default async function EstadisticasPage() {
  const auth = await getAuthUser();
  if (!auth) redirect("/admin/login");

  const canViewAll = hasPermission(auth.role, "view_all_stats");
  const canViewOwn = hasPermission(auth.role, "view_own_stats");
  if (!canViewAll && !canViewOwn) redirect("/admin/dashboard");

  const supabase = await createClient();

  // Fetch all tasks
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, status, priority, created_at, completed_at, due_date, created_by");

  // Fetch all assignments with confirmation info
  const { data: assignments } = await supabase
    .from("task_assignments")
    .select("id, task_id, user_id, confirmed, confirmed_at");

  // Fetch all attachments
  const { data: attachments } = await supabase
    .from("task_attachments")
    .select("id, task_id, user_id");

  // Fetch all comments
  const { data: comments } = await supabase
    .from("task_comments")
    .select("id, task_id, user_id");

  // Fetch profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role")
    .order("full_name");

  return (
    <EstadisticasClient
      tasks={tasks || []}
      assignments={assignments || []}
      attachments={attachments || []}
      comments={comments || []}
      profiles={profiles || []}
      currentUserId={auth.user.id}
      canViewAll={canViewAll}
    />
  );
}
