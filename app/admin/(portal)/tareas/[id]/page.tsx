import { createClient } from "@/utils/supabase/server";
import { getAuthUser } from "@/utils/auth";
import { hasPermission } from "@/utils/roles";
import { redirect, notFound } from "next/navigation";
import TaskDetailClient from "./TaskDetailClient";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getAuthUser();
  if (!auth) redirect("/admin/login");
  if (!hasPermission(auth.role, "view_tasks")) redirect("/admin/dashboard");

  const supabase = await createClient();
  const canManage = hasPermission(auth.role, "manage_tasks");

  const { data: task } = await supabase
    .from("tasks")
    .select(`
      id, title, description, status, priority, due_date, created_at, updated_at, started_at, completed_at, created_by,
      creator:profiles!tasks_created_by_fkey(id, full_name, avatar_url)
    `)
    .eq("id", id)
    .single();

  if (!task) notFound();

  // Supabase joins return arrays — unwrap creator to single object
  const normalizedTask = {
    ...task,
    creator: Array.isArray(task.creator) ? task.creator[0] : task.creator,
  };

  const [
    { data: assignments },
    { data: comments },
    { data: attachments },
    { data: activity },
    { data: profiles },
    { data: taskRoom },
  ] = await Promise.all([
    supabase
      .from("task_assignments")
      .select("id, user_id, confirmed, confirmed_at, user:profiles!task_assignments_user_id_fkey(id, full_name, avatar_url)")
      .eq("task_id", id),
    supabase
      .from("task_comments")
      .select(`
        id, content, parent_id, created_at, updated_at,
        user:profiles!task_comments_user_id_fkey(id, full_name, avatar_url),
        task_comment_reactions(id, emoji, user_id)
      `)
      .eq("task_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("task_attachments")
      .select("id, file_url, file_name, file_type, file_size, created_at, user:profiles!task_attachments_user_id_fkey(id, full_name, avatar_url)")
      .eq("task_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("task_activity")
      .select("id, action, details, created_at, user:profiles!task_activity_user_id_fkey(id, full_name, avatar_url)")
      .eq("task_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, role")
      .order("full_name"),
    supabase
      .from("chat_rooms")
      .select("id, name")
      .eq("task_id", id)
      .maybeSingle(),
  ]);

  const myAssignment = (assignments || []).find((a: any) => a.user_id === auth.user.id);
  const mustAcceptBeforeInternalAccess = !canManage && !!myAssignment && !myAssignment.confirmed;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unwrap = (obj: any) => Array.isArray(obj) ? obj[0] : obj;

  return (
    <TaskDetailClient
      task={normalizedTask}
      assignments={(assignments || []).map((a: any) => ({ ...a, user: unwrap(a.user) }))}
      comments={mustAcceptBeforeInternalAccess ? [] : (comments || []).map((c: any) => ({ ...c, user: unwrap(c.user) }))}
      attachments={mustAcceptBeforeInternalAccess ? [] : (attachments || []).map((a: any) => ({ ...a, user: unwrap(a.user) }))}
      activity={mustAcceptBeforeInternalAccess ? [] : (activity || []).map((a: any) => ({ ...a, user: unwrap(a.user) }))}
      profiles={profiles || []}
      currentUserId={auth.user.id}
      currentRole={auth.role}
      canManage={canManage}
      mustAcceptBeforeInternalAccess={mustAcceptBeforeInternalAccess}
      taskRoom={taskRoom || null}
    />
  );
}
