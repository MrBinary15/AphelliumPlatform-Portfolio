"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getAuthUser, requirePermission } from "@/utils/auth";
import { revalidatePath } from "next/cache";

// ─── Types ───
export type TaskStatus = "pendiente" | "en_progreso" | "completada" | "cancelada" | "postergada";
export type TaskPriority = "baja" | "media" | "alta" | "urgente";

async function canCollaborateOnTask(taskId: string, userId: string) {
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return { ok: false, error: "No se pudo validar permisos de tarea." };
  }

  if (profile?.role === "admin" || profile?.role === "coordinador") {
    return { ok: true };
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from("task_assignments")
    .select("confirmed")
    .eq("task_id", taskId)
    .eq("user_id", userId)
    .maybeSingle();

  if (assignmentError) {
    return { ok: false, error: "No se pudo validar asignación de tarea." };
  }

  if (!assignment) {
    return { ok: false, error: "Debes estar asignado a la tarea para interactuar." };
  }

  if (!assignment.confirmed) {
    return { ok: false, error: "Debes aceptar la tarea antes de acceder al contenido interno." };
  }

  return { ok: true };
}

async function ensureTaskChatRoomForConfirmedMembers(taskId: string, actorId: string) {
  const admin = createAdminClient();

  const { data: task } = await admin
    .from("tasks")
    .select("id, title, created_by")
    .eq("id", taskId)
    .maybeSingle();

  if (!task) return null;

  const { data: existingRoom } = await admin
    .from("chat_rooms")
    .select("id")
    .eq("task_id", taskId)
    .maybeSingle();

  let roomId = existingRoom?.id ?? null;

  if (!roomId) {
    const { data: createdRoom } = await admin
      .from("chat_rooms")
      .insert({
        name: `Tarea: ${task.title}`,
        room_type: "task",
        task_id: taskId,
        created_by: actorId,
      })
      .select("id")
      .single();

    roomId = createdRoom?.id ?? null;
  }

  if (!roomId) return null;

  const { data: confirmedAssignments } = await admin
    .from("task_assignments")
    .select("user_id")
    .eq("task_id", taskId)
    .eq("confirmed", true);

  const memberIds = Array.from(new Set([task.created_by, ...(confirmedAssignments || []).map((a) => a.user_id)]));
  if (memberIds.length === 0) return roomId;

  await admin
    .from("chat_room_members")
    .upsert(
      memberIds.map((userId) => ({ room_id: roomId, user_id: userId, added_by: actorId })),
      { onConflict: "room_id,user_id" }
    );

  return roomId;
}

async function syncTaskChatMembers(taskId: string, actorId: string) {
  const admin = createAdminClient();

  const { data: room } = await admin
    .from("chat_rooms")
    .select("id")
    .eq("task_id", taskId)
    .maybeSingle();

  if (!room?.id) return;

  const { data: task } = await admin
    .from("tasks")
    .select("created_by")
    .eq("id", taskId)
    .maybeSingle();

  if (!task?.created_by) return;

  const { data: confirmedAssignments } = await admin
    .from("task_assignments")
    .select("user_id")
    .eq("task_id", taskId)
    .eq("confirmed", true);

  const desiredIds = Array.from(new Set([task.created_by, ...(confirmedAssignments || []).map((a) => a.user_id)]));
  if (desiredIds.length === 0) return;

  await admin
    .from("chat_room_members")
    .upsert(
      desiredIds.map((userId) => ({ room_id: room.id, user_id: userId, added_by: actorId })),
      { onConflict: "room_id,user_id" }
    );

  const inFilter = `(${desiredIds.join(",")})`;
  await admin
    .from("chat_room_members")
    .delete()
    .eq("room_id", room.id)
    .not("user_id", "in", inFilter);
}

// ─── Create Task ───
export async function createTask(formData: FormData) {
  const check = await requirePermission("manage_tasks");
  if ("error" in check) return check;

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const priority = (formData.get("priority") as TaskPriority) || "media";
  const dueDate = formData.get("due_date") as string;
  const assignees = formData.getAll("assignees") as string[];

  if (!title) return { error: "El título es requerido" };

  const supabase = await createClient();

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      title,
      description,
      priority,
      due_date: dueDate || null,
      created_by: check.auth.user.id,
    })
    .select("id")
    .single();

  if (error) return { error: "Error al crear la tarea: " + error.message };

  // Assign users
  if (assignees.length > 0) {
    const assignments = assignees.map((userId) => ({
      task_id: task.id,
      user_id: userId,
    }));
    await supabase.from("task_assignments").insert(assignments);
  }

  // Activity log
  await supabase.from("task_activity").insert({
    task_id: task.id,
    user_id: check.auth.user.id,
    action: "created",
    details: { title, assignees_count: assignees.length },
  });

  revalidatePath("/admin/tareas");
  return { success: true, taskId: task.id };
}

// ─── Update Task ───
export async function updateTask(taskId: string, formData: FormData) {
  const check = await requirePermission("manage_tasks");
  if ("error" in check) return check;

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const status = formData.get("status") as TaskStatus;
  const priority = formData.get("priority") as TaskPriority;
  const dueDate = formData.get("due_date") as string;

  if (!title) return { error: "El título es requerido" };

  const supabase = await createClient();

  const updates: Record<string, unknown> = {
    title,
    description,
    status,
    priority,
    due_date: dueDate || null,
    updated_at: new Date().toISOString(),
  };

  if (status === "en_progreso") updates.started_at = new Date().toISOString();
  if (status === "completada") updates.completed_at = new Date().toISOString();

  const { error } = await supabase.from("tasks").update(updates).eq("id", taskId);
  if (error) return { error: "Error al actualizar: " + error.message };

  await supabase.from("task_activity").insert({
    task_id: taskId,
    user_id: check.auth.user.id,
    action: "updated",
    details: { status, priority },
  });

  revalidatePath("/admin/tareas");
  revalidatePath(`/admin/tareas/${taskId}`);
  return { success: true };
}

// ─── Update Assignees ───
export async function updateTaskAssignees(taskId: string, userIds: string[]) {
  const check = await requirePermission("manage_tasks");
  if ("error" in check) return check;

  const supabase = await createClient();

  // Remove all current assignees
  await supabase.from("task_assignments").delete().eq("task_id", taskId);

  // Add new assignees
  if (userIds.length > 0) {
    const assignments = userIds.map((userId) => ({
      task_id: taskId,
      user_id: userId,
    }));
    await supabase.from("task_assignments").insert(assignments);
  }

  try {
    await syncTaskChatMembers(taskId, check.auth.user.id);
  } catch {
    // Do not fail assignee update if chat sync is unavailable.
  }

  await supabase.from("task_activity").insert({
    task_id: taskId,
    user_id: check.auth.user.id,
    action: "assignees_updated",
    details: { assignees_count: userIds.length },
  });

  revalidatePath(`/admin/tareas/${taskId}`);
  return { success: true };
}

// ─── Delete Task ───
export async function deleteTask(taskId: string) {
  const check = await requirePermission("manage_tasks");
  if ("error" in check) return check;

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) return { error: "Error al eliminar: " + error.message };

  revalidatePath("/admin/tareas");
  return { success: true };
}

// ─── Confirm Attendance ───
export async function confirmAttendance(taskId: string) {
  const auth = await getAuthUser();
  if (!auth) return { error: "No autorizado" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("task_assignments")
    .update({ confirmed: true, confirmed_at: new Date().toISOString() })
    .eq("task_id", taskId)
    .eq("user_id", auth.user.id);

  if (error) return { error: "Error al confirmar: " + error.message };

  let roomId: string | null = null;
  try {
    roomId = await ensureTaskChatRoomForConfirmedMembers(taskId, auth.user.id);
  } catch {
    roomId = null;
  }

  await supabase.from("task_activity").insert({
    task_id: taskId,
    user_id: auth.user.id,
    action: "attendance_confirmed",
  });

  revalidatePath(`/admin/tareas/${taskId}`);
  return { success: true, roomId };
}

// ─── Add Comment ───
export async function addComment(taskId: string, content: string, parentId?: string) {
  const auth = await getAuthUser();
  if (!auth) return { error: "No autorizado" };
  if (!content.trim()) return { error: "El comentario no puede estar vacío" };

  const access = await canCollaborateOnTask(taskId, auth.user.id);
  if (!access.ok) return { error: access.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_comments")
    .insert({
      task_id: taskId,
      user_id: auth.user.id,
      content: content.trim(),
      parent_id: parentId || null,
    })
    .select("id")
    .single();

  if (error) return { error: "Error al publicar comentario: " + error.message };

  revalidatePath(`/admin/tareas/${taskId}`);
  return { success: true, commentId: data.id };
}

function escapeHtml(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ─── Add Comment with Files ───
export async function addCommentWithFiles(taskId: string, formData: FormData) {
  const auth = await getAuthUser();
  if (!auth) return { error: "No autorizado" };

  const access = await canCollaborateOnTask(taskId, auth.user.id);
  if (!access.ok) return { error: access.error };

  const content = ((formData.get("content") as string) || "").trim();
  const parentId = (formData.get("parentId") as string) || null;
  const files = formData.getAll("files") as File[];

  if (!content && files.length === 0) return { error: "El comentario no puede estar vacío" };

  const supabase = await createClient();
  const maxSize = 50 * 1024 * 1024;
  let mediaHtml = "";
  const errors: string[] = [];

  for (const file of files) {
    if (!file || typeof file === "string") continue;
    const fSize = file.size || 0;
    if (fSize === 0 || fSize > maxSize) {
      errors.push(`${file.name || "archivo"}: tamaño inválido`);
      continue;
    }

    const ext = (file.name || "bin").split(".").pop() || "bin";
    const path = `${taskId}/${crypto.randomUUID()}.${ext}`;
    const contentType = file.type || "application/octet-stream";

    // Convert to ArrayBuffer for reliable upload across runtimes
    let buffer: ArrayBuffer;
    try {
      buffer = await file.arrayBuffer();
    } catch {
      errors.push(`${file.name}: error al leer archivo`);
      continue;
    }

    const { error: uploadError } = await supabase.storage
      .from("task_attachments")
      .upload(path, buffer, { contentType, upsert: false });

    if (uploadError) {
      errors.push(`${file.name}: ${uploadError.message}`);
      continue;
    }

    const { data: urlData } = supabase.storage.from("task_attachments").getPublicUrl(path);
    const url = urlData.publicUrl;
    const safeName = escapeHtml(file.name || "archivo");

    if (contentType.startsWith("image/")) {
      mediaHtml += `<img src="${url}" alt="${safeName}" style="max-width:100%;border-radius:12px;margin-top:8px;" />`;
    } else if (contentType.startsWith("video/")) {
      mediaHtml += `<video src="${url}" controls style="max-width:100%;border-radius:12px;margin-top:8px;"></video>`;
    } else {
      const sz = fSize < 1024 ? `${fSize} B` : fSize < 1048576 ? `${(fSize / 1024).toFixed(1)} KB` : `${(fSize / 1048576).toFixed(1)} MB`;
      mediaHtml += `<div style="margin-top:6px;"><a href="${url}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;font-size:12px;">📎 ${safeName} <span style="opacity:0.5">(${sz})</span></a></div>`;
    }

    // Track in task_attachments for sidebar
    await supabase.from("task_attachments").insert({
      task_id: taskId,
      user_id: auth.user.id,
      file_url: url,
      file_name: file.name,
      file_type: contentType,
      file_size: fSize,
    });
  }

  const fullContent = content + (mediaHtml ? `<div>${mediaHtml}</div>` : "");

  if (!fullContent.trim()) {
    return { error: errors.length > 0 ? `Error al subir archivos: ${errors.join(", ")}` : "Sin contenido para publicar" };
  }

  const { data, error } = await supabase
    .from("task_comments")
    .insert({
      task_id: taskId,
      user_id: auth.user.id,
      content: fullContent,
      parent_id: parentId || null,
    })
    .select("id")
    .single();

  if (error) return { error: "Error al publicar comentario: " + error.message };

  revalidatePath(`/admin/tareas/${taskId}`);
  return { success: true, commentId: data.id, warnings: errors.length > 0 ? errors : undefined };
}

// ─── Delete Comment ───
export async function deleteComment(commentId: string, taskId: string) {
  const auth = await getAuthUser();
  if (!auth) return { error: "No autorizado" };

  const access = await canCollaborateOnTask(taskId, auth.user.id);
  if (!access.ok) return { error: access.error };

  const supabase = await createClient();
  const { error } = await supabase.from("task_comments").delete().eq("id", commentId);
  if (error) return { error: "Error al eliminar comentario: " + error.message };

  revalidatePath(`/admin/tareas/${taskId}`);
  return { success: true };
}

// ─── Toggle Reaction ───
export async function toggleReaction(commentId: string, emoji: string, taskId: string) {
  const auth = await getAuthUser();
  if (!auth) return { error: "No autorizado" };

  const access = await canCollaborateOnTask(taskId, auth.user.id);
  if (!access.ok) return { error: access.error };

  const supabase = await createClient();

  // Check if already reacted
  const { data: existing } = await supabase
    .from("task_comment_reactions")
    .select("id")
    .eq("comment_id", commentId)
    .eq("user_id", auth.user.id)
    .eq("emoji", emoji)
    .single();

  if (existing) {
    await supabase.from("task_comment_reactions").delete().eq("id", existing.id);
  } else {
    await supabase.from("task_comment_reactions").insert({
      comment_id: commentId,
      user_id: auth.user.id,
      emoji,
    });
  }

  revalidatePath(`/admin/tareas/${taskId}`);
  return { success: true };
}

// ─── Upload Attachment ───
export async function uploadAttachment(taskId: string, formData: FormData) {
  const auth = await getAuthUser();
  if (!auth) return { error: "No autorizado" };

  const access = await canCollaborateOnTask(taskId, auth.user.id);
  if (!access.ok) return { error: access.error };

  const file = formData.get("file") as File;
  if (!file || file.size === 0) return { error: "No se seleccionó archivo" };

  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) return { error: "El archivo supera el máximo de 50MB" };

  const supabase = await createClient();
  const ext = file.name.split(".").pop() || "bin";
  const path = `${taskId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("task_attachments")
    .upload(path, file);

  if (uploadError) return { error: "Error al subir archivo: " + uploadError.message };

  const { data: urlData } = supabase.storage.from("task_attachments").getPublicUrl(path);

  const { error } = await supabase.from("task_attachments").insert({
    task_id: taskId,
    user_id: auth.user.id,
    file_url: urlData.publicUrl,
    file_name: file.name,
    file_type: file.type,
    file_size: file.size,
  });

  if (error) return { error: "Error al registrar archivo: " + error.message };

  await supabase.from("task_activity").insert({
    task_id: taskId,
    user_id: auth.user.id,
    action: "attachment_uploaded",
    details: { file_name: file.name },
  });

  revalidatePath(`/admin/tareas/${taskId}`);
  return { success: true };
}

// ─── Delete Attachment ───
export async function deleteAttachment(attachmentId: string, taskId: string) {
  const auth = await getAuthUser();
  if (!auth) return { error: "No autorizado" };

  const access = await canCollaborateOnTask(taskId, auth.user.id);
  if (!access.ok) return { error: access.error };

  const supabase = await createClient();
  const { error } = await supabase.from("task_attachments").delete().eq("id", attachmentId);
  if (error) return { error: "Error al eliminar archivo: " + error.message };

  revalidatePath(`/admin/tareas/${taskId}`);
  return { success: true };
}
