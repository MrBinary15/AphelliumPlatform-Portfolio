"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { normalizeRole } from "@/utils/roles";
import { revalidatePath } from "next/cache";

async function getUserWithRole() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return { user, role: normalizeRole(profile?.role), supabase };
}

export async function createMeeting(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || "";
  const scheduledAt = formData.get("scheduled_at") as string;
  const coHostId = (formData.get("co_host_id") as string) || null;
  const useMetered = formData.get("use_metered") === "1";

  if (!title) return { error: "El título es requerido" };

  const settings = {
    allow_chat: true,
    allow_screen_share: true,
    allow_hand_raise: true,
    mute_on_join: false,
    camera_off_on_join: false,
    use_metered: useMetered,
  };

  const { data, error } = await supabase
    .from("meetings")
    .insert({
      title,
      description,
      host_id: user.id,
      co_host_id: coHostId || null,
      scheduled_at: scheduledAt || null,
      settings,
    })
    .select("id, slug")
    .single();

  if (error) return { error: `Error al crear: ${error.message}` };
  if (!data) return { error: "No se pudo crear la reunión" };

  revalidatePath("/admin/reuniones");
  return { success: true, meetingId: data.id, slug: data.slug };
}

export async function updateMeeting(meetingId: string, formData: FormData) {
  const auth = await getUserWithRole();
  if (!auth) return { error: "No autorizado" };
  const { user, role, supabase } = auth;

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || "";
  const scheduledAt = formData.get("scheduled_at") as string;
  const coHostId = (formData.get("co_host_id") as string) || null;

  if (!title) return { error: "El título es requerido" };

  // Host, co-host, or admin can update
  const { data: mtg } = await supabase.from("meetings").select("host_id, co_host_id").eq("id", meetingId).single();
  if (!mtg || (role !== "admin" && mtg.host_id !== user.id && mtg.co_host_id !== user.id)) return { error: "No tienes permiso para editar esta reunión" };

  const { error } = await supabase
    .from("meetings")
    .update({
      title,
      description,
      scheduled_at: scheduledAt || null,
      co_host_id: coHostId || null,
    })
    .eq("id", meetingId);

  if (error) return { error: error.message };

  revalidatePath("/admin/reuniones");
  return { success: true };
}

export async function endMeeting(meetingId: string) {
  const auth = await getUserWithRole();
  if (!auth) return { error: "No autorizado" };
  const { user, role, supabase } = auth;

  // Verify user is host, co-host, or admin
  const { data: meeting } = await supabase
    .from("meetings")
    .select("host_id, co_host_id")
    .eq("id", meetingId)
    .single();

  if (!meeting) return { error: "Reunión no encontrada" };
  if (role !== "admin" && meeting.host_id !== user.id && meeting.co_host_id !== user.id) {
    return { error: "Solo el anfitrión o un admin puede finalizar la reunión" };
  }

  const now = new Date().toISOString();

  // Use service client to bypass RLS for cleanup of other users' records
  const admin = createAdminClient();
  await Promise.allSettled([
    admin.from("webrtc_signals").delete().eq("room_id", meetingId),
    admin.from("meeting_participants").update({ left_at: now }).eq("meeting_id", meetingId).is("left_at", null),
    admin.from("meeting_invitations").update({ status: "declined" }).eq("meeting_id", meetingId).eq("status", "pending"),
  ]);

  const { error } = await admin
    .from("meetings")
    .update({ status: "finished", ended_at: now })
    .eq("id", meetingId);

  if (error) return { error: `Error al finalizar: ${error.message}` };

  revalidatePath("/admin/reuniones");
  return { success: true };
}

export async function cancelMeeting(meetingId: string) {
  const auth = await getUserWithRole();
  if (!auth) return { error: "No autorizado" };
  const { user, role, supabase } = auth;

  // Host, co-host, or admin can cancel
  const { data: mtg } = await supabase.from("meetings").select("host_id, co_host_id").eq("id", meetingId).single();
  if (!mtg || (role !== "admin" && mtg.host_id !== user.id && mtg.co_host_id !== user.id)) return { error: "No tienes permiso para cancelar esta reunión" };

  const admin = createAdminClient();

  // Clean up signals and dismiss pending invitations
  await Promise.allSettled([
    admin.from("webrtc_signals").delete().eq("room_id", meetingId),
    admin.from("meeting_invitations").update({ status: "declined" }).eq("meeting_id", meetingId).eq("status", "pending"),
  ]);

  const { error } = await admin
    .from("meetings")
    .update({ status: "cancelled" })
    .eq("id", meetingId);

  if (error) return { error: `Error al cancelar: ${error.message}` };

  revalidatePath("/admin/reuniones");
  return { success: true };
}

export async function deleteMeeting(meetingId: string) {
  const auth = await getUserWithRole();
  if (!auth) return { error: "No autorizado" };
  const { user, role, supabase } = auth;

  // Host or admin can delete
  const { data: mtg } = await supabase.from("meetings").select("host_id").eq("id", meetingId).single();
  if (!mtg || (role !== "admin" && mtg.host_id !== user.id)) return { error: "Solo el anfitrión o un admin puede eliminar la reunión" };

  // Use service client to bypass RLS for cleanup + deletion
  const admin = createAdminClient();

  // Clean up related records before deleting the meeting
  await Promise.allSettled([
    admin.from("webrtc_signals").delete().eq("room_id", meetingId),
    admin.from("meeting_participants").delete().eq("meeting_id", meetingId),
    admin.from("meeting_invitations").delete().eq("meeting_id", meetingId),
    admin.from("meeting_messages").delete().eq("meeting_id", meetingId),
  ]);

  const { error } = await admin
    .from("meetings")
    .delete()
    .eq("id", meetingId);

  if (error) return { error: `Error al eliminar: ${error.message}` };

  revalidatePath("/admin/reuniones");
  return { success: true };
}

export async function inviteToMeeting(meetingId: string, userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { error } = await supabase
    .from("meeting_invitations")
    .insert({
      meeting_id: meetingId,
      user_id: userId,
      invited_by: user.id,
    });

  if (error) return { error: error.message };
  return { success: true };
}

export async function respondToInvitation(invitationId: string, accept: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { error } = await supabase
    .from("meeting_invitations")
    .update({ status: accept ? "accepted" : "declined" })
    .eq("id", invitationId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/admin/reuniones");
  return { success: true };
}

export async function toggleMeetingLock(meetingId: string, locked: boolean) {
  const auth = await getUserWithRole();
  if (!auth) return { error: "No autorizado" };
  const { user, role, supabase } = auth;

  if (role === "admin") {
    const admin = createAdminClient();
    const { error } = await admin.from("meetings").update({ is_locked: locked }).eq("id", meetingId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("meetings")
      .update({ is_locked: locked })
      .eq("id", meetingId)
      .or(`host_id.eq.${user.id},co_host_id.eq.${user.id}`);
    if (error) return { error: error.message };
  }
  return { success: true };
}

export async function toggleMeetingPublic(meetingId: string, isPublic: boolean) {
  const auth = await getUserWithRole();
  if (!auth) return { error: "No autorizado" };
  const { user, role, supabase } = auth;

  if (role === "admin") {
    const admin = createAdminClient();
    const { error } = await admin.from("meetings").update({ is_public: isPublic }).eq("id", meetingId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("meetings")
      .update({ is_public: isPublic })
      .eq("id", meetingId)
      .or(`host_id.eq.${user.id},co_host_id.eq.${user.id}`);
    if (error) return { error: error.message };
  }

  revalidatePath("/admin/reuniones");
  return { success: true };
}

export async function updateMeetingSettings(meetingId: string, settings: Record<string, boolean>) {
  const auth = await getUserWithRole();
  if (!auth) return { error: "No autorizado" };
  const { user, role, supabase } = auth;

  // Merge with existing settings — host, co-host, or admin
  const { data: meeting } = await supabase
    .from("meetings")
    .select("settings, host_id, co_host_id")
    .eq("id", meetingId)
    .single();

  if (!meeting || (role !== "admin" && meeting.host_id !== user.id && meeting.co_host_id !== user.id)) return { error: "No tienes permiso" };

  const merged = { ...(meeting?.settings || {}), ...settings };

  const client = role === "admin" ? createAdminClient() : supabase;
  const { error } = await client
    .from("meetings")
    .update({ settings: merged })
    .eq("id", meetingId);

  if (error) return { error: error.message };
  return { success: true };
}
