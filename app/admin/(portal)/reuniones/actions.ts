"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function createMeeting(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || "";
  const scheduledAt = formData.get("scheduled_at") as string;
  const coHostId = (formData.get("co_host_id") as string) || null;

  if (!title) return { error: "El título es requerido" };

  const { data, error } = await supabase
    .from("meetings")
    .insert({
      title,
      description,
      host_id: user.id,
      co_host_id: coHostId || null,
      scheduled_at: scheduledAt || null,
    })
    .select("id, slug")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/admin/reuniones");
  return { success: true, meetingId: data.id, slug: data.slug };
}

export async function updateMeeting(meetingId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || "";
  const scheduledAt = formData.get("scheduled_at") as string;
  const coHostId = (formData.get("co_host_id") as string) || null;

  if (!title) return { error: "El título es requerido" };

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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  // Clean up WebRTC signals so the next session starts fresh
  await supabase.from("webrtc_signals").delete().eq("room_id", meetingId);

  const { error } = await supabase
    .from("meetings")
    .update({ status: "finished", ended_at: new Date().toISOString() })
    .eq("id", meetingId);

  if (error) return { error: error.message };

  revalidatePath("/admin/reuniones");
  return { success: true };
}

export async function cancelMeeting(meetingId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { error } = await supabase
    .from("meetings")
    .update({ status: "cancelled" })
    .eq("id", meetingId);

  if (error) return { error: error.message };

  revalidatePath("/admin/reuniones");
  return { success: true };
}

export async function deleteMeeting(meetingId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { error } = await supabase
    .from("meetings")
    .delete()
    .eq("id", meetingId);

  if (error) return { error: error.message };

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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { error } = await supabase
    .from("meetings")
    .update({ is_locked: locked })
    .eq("id", meetingId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function toggleMeetingPublic(meetingId: string, isPublic: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { error } = await supabase
    .from("meetings")
    .update({ is_public: isPublic })
    .eq("id", meetingId);

  if (error) return { error: error.message };

  revalidatePath("/admin/reuniones");
  return { success: true };
}

export async function updateMeetingSettings(meetingId: string, settings: Record<string, boolean>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  // Merge with existing settings
  const { data: meeting } = await supabase
    .from("meetings")
    .select("settings")
    .eq("id", meetingId)
    .single();

  const merged = { ...(meeting?.settings || {}), ...settings };

  const { error } = await supabase
    .from("meetings")
    .update({ settings: merged })
    .eq("id", meetingId);

  if (error) return { error: error.message };
  return { success: true };
}
