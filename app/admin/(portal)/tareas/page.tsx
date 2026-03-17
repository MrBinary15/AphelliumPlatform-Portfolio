import { createClient } from "@/utils/supabase/server";
import { getAuthUser } from "@/utils/auth";
import { hasPermission } from "@/utils/roles";
import { redirect } from "next/navigation";
import TareasClient from "./TareasClient";

export default async function TareasPage() {
  const auth = await getAuthUser();
  if (!auth) redirect("/admin/login");
  if (!hasPermission(auth.role, "view_tasks")) redirect("/admin/dashboard");

  const supabase = await createClient();
  const canManage = hasPermission(auth.role, "manage_tasks");

  // Fetch tasks with assignments count
  const { data: tasks } = await supabase
    .from("tasks")
    .select(`
      id, title, description, status, priority, due_date, created_at, updated_at, started_at, completed_at,
      created_by,
      creator:profiles!tasks_created_by_fkey(id, full_name, avatar_url),
      task_assignments(id, user_id, confirmed, user:profiles!task_assignments_user_id_fkey(id, full_name, avatar_url)),
      task_comments(id),
      task_attachments(id)
    `)
    .order("created_at", { ascending: false });

  // Fetch all profiles for assignment selector
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role")
    .order("full_name");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unwrap = (obj: any) => Array.isArray(obj) ? obj[0] : obj;
  const normalizedTasks = (tasks || []).map((t: any) => ({
    ...t,
    creator: unwrap(t.creator),
    task_assignments: (t.task_assignments || []).map((a: any) => ({ ...a, user: unwrap(a.user) })),
  }));

  return (
    <TareasClient
      tasks={normalizedTasks}
      profiles={profiles || []}
      currentUserId={auth.user.id}
      currentRole={auth.role}
      canManage={canManage}
    />
  );
}
