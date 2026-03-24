"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { normalizeRole } from "@/utils/roles";
import { revalidatePath } from "next/cache";
import { sendPushToUser } from "@/utils/pushNotifications";
import { notifyUsers, getTeamUserIds } from "@/utils/notifications";

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
  const isPublic = formData.get("is_public") === "1";
  const requireCode = formData.get("require_code") === "1";
  const requireApproval = formData.get("require_approval") === "1";
  const rawCode = (formData.get("access_code") as string)?.trim() || "";

  if (!title) return { error: "El título es requerido" };

  // Validate access code if required
  let accessCode: string | null = null;
  if (requireCode) {
    if (rawCode) {
      if (!/^[a-zA-Z0-9]{4,20}$/.test(rawCode)) return { error: "El código debe ser alfanumérico (4-20 caracteres)" };
      accessCode = rawCode.toUpperCase();
    } else {
      // Generate random 6-char alphanumeric code
      const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
      accessCode = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    }
  }

  const settings = {
    allow_chat: true,
    allow_screen_share: true,
    allow_hand_raise: true,
    mute_on_join: false,
    camera_off_on_join: false,
    use_metered: useMetered,
    require_host_approval: requireApproval,
  };

  const { data, error } = await supabase
    .from("meetings")
    .insert({
      title,
      description,
      host_id: user.id,
      co_host_id: coHostId || null,
      scheduled_at: scheduledAt || null,
      is_public: isPublic,
      is_locked: !isPublic,
      access_code: accessCode,
      settings,
    })
    .select("id, slug")
    .single();

  if (error) return { error: `Error al crear: ${error.message}` };
  if (!data) return { error: "No se pudo crear la reunión" };

  // Notify all team members about new meeting
  getTeamUserIds(user.id).then((ids) =>
    notifyUsers(ids, {
      type: "meeting",
      title: "Nueva reunión creada",
      body: title,
      url: `/admin/reuniones/${data.slug || data.id}`,
    })
  ).catch(() => {});

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

  // Send push notification for the call/meeting invitation
  const admin = createAdminClient();
  const { data: meeting } = await admin
    .from("meetings")
    .select("title, slug")
    .eq("id", meetingId)
    .single();
  const { data: inviter } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const inviterName = inviter?.full_name || "Un miembro del equipo";
  const meetingTitle = meeting?.title || "Reunión";

  sendPushToUser(userId, {
    title: `📞 ${inviterName} te invita`,
    body: `Te están llamando a: ${meetingTitle}`,
    type: "call",
    url: `/admin/reuniones/sala/${meeting?.slug || meetingId}`,
    meetingSlug: meeting?.slug || meetingId,
  }).catch(() => {});

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

/**
 * Server action used by ChatWidget to resolve invitation → meeting slug + caller name.
 * Uses adminClient so it is never blocked by RLS on the meetings table.
 */
export async function getInvitationDetails(invitationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(invitationId)) return null;

  const admin = createAdminClient();

  const { data: inv } = await admin
    .from("meeting_invitations")
    .select("id, meeting_id, invited_by, user_id")
    .eq("id", invitationId)
    .single();

  if (!inv || inv.user_id !== user.id) return null; // only the target user can resolve

  const [{ data: mtg }, { data: profile }] = await Promise.all([
    admin.from("meetings").select("slug, title").eq("id", inv.meeting_id).single(),
    admin.from("profiles").select("full_name").eq("id", inv.invited_by).single(),
  ]);

  if (!mtg?.slug) return null;

  return {
    slug: mtg.slug,
    title: mtg.title ?? "",
    callerName: profile?.full_name || "Alguien",
  };
}

export async function verifyMeetingCode(meetingId: string, code: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const admin = createAdminClient();
  const { data: meeting } = await admin
    .from("meetings")
    .select("access_code, host_id, co_host_id")
    .eq("id", meetingId)
    .single();

  if (!meeting) return { error: "Reunión no encontrada" };
  if (!meeting.access_code) return { granted: true };
  if (meeting.host_id === user.id || meeting.co_host_id === user.id) return { granted: true };
  if (code.toUpperCase() === meeting.access_code.toUpperCase()) return { granted: true };
  return { error: "Código incorrecto" };
}

export async function requestJoinApproval(meetingId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const admin = createAdminClient();
  const { data: meeting } = await admin
    .from("meetings")
    .select("id, host_id, co_host_id")
    .eq("id", meetingId)
    .single();

  if (!meeting) return { error: "Reunión no encontrada" };
  if (meeting.host_id === user.id || meeting.co_host_id === user.id) return { status: "accepted" as const };

  const { error } = await admin
    .from("meeting_invitations")
    .upsert(
      {
        meeting_id: meetingId,
        user_id: user.id,
        invited_by: user.id,
        status: "pending",
      },
      { onConflict: "meeting_id,user_id" },
    );

  if (error) return { error: error.message };
  return { status: "pending" as const };
}

export async function getMyJoinApprovalStatus(meetingId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const admin = createAdminClient();
  const { data: meeting } = await admin
    .from("meetings")
    .select("host_id, co_host_id")
    .eq("id", meetingId)
    .single();

  if (!meeting) return { error: "Reunión no encontrada" };
  if (meeting.host_id === user.id || meeting.co_host_id === user.id) return { status: "accepted" as const };

  const { data: participant } = await admin
    .from("meeting_participants")
    .select("id")
    .eq("meeting_id", meetingId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (participant) return { status: "accepted" as const };

  const { data: inv } = await admin
    .from("meeting_invitations")
    .select("status")
    .eq("meeting_id", meetingId)
    .eq("user_id", user.id)
    .maybeSingle();

  return { status: (inv?.status ?? "none") as "none" | "pending" | "accepted" | "declined" };
}

export async function listPendingJoinApprovals(meetingId: string) {
  const auth = await getUserWithRole();
  if (!auth) return { error: "No autorizado" };
  const { user, role } = auth;

  const admin = createAdminClient();
  const { data: meeting } = await admin
    .from("meetings")
    .select("host_id, co_host_id")
    .eq("id", meetingId)
    .single();

  if (!meeting) return { error: "Reunión no encontrada" };
  if (role !== "admin" && meeting.host_id !== user.id && meeting.co_host_id !== user.id) {
    return { error: "No tienes permiso" };
  }

  const { data, error } = await admin
    .from("meeting_invitations")
    .select("id, user_id, created_at, profiles:user_id(full_name, avatar_url)")
    .eq("meeting_id", meetingId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) return { error: error.message };
  return { requests: data ?? [] };
}

export async function respondJoinApproval(meetingId: string, participantUserId: string, accept: boolean) {
  const auth = await getUserWithRole();
  if (!auth) return { error: "No autorizado" };
  const { user, role } = auth;

  const admin = createAdminClient();
  const { data: meeting } = await admin
    .from("meetings")
    .select("host_id, co_host_id")
    .eq("id", meetingId)
    .single();

  if (!meeting) return { error: "Reunión no encontrada" };
  if (role !== "admin" && meeting.host_id !== user.id && meeting.co_host_id !== user.id) {
    return { error: "No tienes permiso" };
  }

  const { error } = await admin
    .from("meeting_invitations")
    .upsert(
      {
        meeting_id: meetingId,
        user_id: participantUserId,
        invited_by: user.id,
        status: accept ? "accepted" : "declined",
      },
      { onConflict: "meeting_id,user_id" },
    );

  if (error) return { error: error.message };

  if (accept) {
    await admin
      .from("meeting_participants")
      .upsert(
        {
          meeting_id: meetingId,
          user_id: participantUserId,
          role: "participant",
          left_at: null,
        },
        { onConflict: "meeting_id,user_id" },
      );
  }

  return { success: true };
}

export async function resetMeetingSignals(meetingId: string) {
  const auth = await getUserWithRole();
  if (!auth) return { error: "No autorizado" };
  const { user, role } = auth;

  const admin = createAdminClient();
  const { data: meeting } = await admin
    .from("meetings")
    .select("host_id, co_host_id")
    .eq("id", meetingId)
    .single();

  if (!meeting) return { error: "Reunión no encontrada" };
  if (role !== "admin" && meeting.host_id !== user.id && meeting.co_host_id !== user.id) {
    return { error: "No tienes permiso" };
  }

  const { error } = await admin
    .from("webrtc_signals")
    .delete()
    .eq("room_id", meetingId);

  if (error) return { error: error.message };
  return { success: true };
}
