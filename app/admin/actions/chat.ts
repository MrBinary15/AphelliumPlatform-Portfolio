"use server";

import { createClient } from "@/utils/supabase/server";

export async function getTeamMembers() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado", members: [] };

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role")
    .neq("id", user.id)
    .order("full_name");

  if (error) return { error: error.message, members: [] };
  return { members: data || [] };
}

export async function getChatHistory(otherUserId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado", messages: [] };

  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .or(
      `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`,
    )
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) return { error: error.message, messages: [] };
  return { messages: data || [] };
}

export async function sendChatMessage(receiverId: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const trimmed = content.trim();
  if (!trimmed) return { error: "Mensaje vacío" };

  const { error } = await supabase.from("chat_messages").insert({
    sender_id: user.id,
    receiver_id: receiverId,
    content: trimmed,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function markChatAsRead(senderId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("chat_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("sender_id", senderId)
    .eq("receiver_id", user.id)
    .is("read_at", null);
}
