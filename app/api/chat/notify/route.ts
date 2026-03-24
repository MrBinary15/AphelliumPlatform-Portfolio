import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { sendPushToUser } from "@/utils/pushNotifications";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { receiverId?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const { receiverId, message } = body;
  if (!receiverId || !message) {
    return NextResponse.json({ error: "receiverId y message requeridos" }, { status: 400 });
  }

  // Get sender name
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const senderName = profile?.full_name || user.email?.split("@")[0] || "Usuario";

  // Truncate message for notification
  const isFile = message.startsWith("__file__|");
  const notifBody = isFile ? "Te envió un archivo" : (message.length > 120 ? message.slice(0, 120) + "…" : message);

  try {
    await sendPushToUser(receiverId, {
      title: senderName,
      body: notifBody,
      type: "message",
      url: "/admin/dashboard",
      tag: `dm-${user.id}`,
    });
    return NextResponse.json({ sent: true });
  } catch {
    return NextResponse.json({ sent: false });
  }
}
