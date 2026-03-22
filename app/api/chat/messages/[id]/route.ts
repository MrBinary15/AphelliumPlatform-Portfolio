import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

const BUCKET = "chat-files";
const FILE_MSG_PREFIX = "__file__|";

type ChatFilePayload = {
  name?: string;
  url?: string;
  mimeType?: string;
  size?: number;
  storagePath?: string;
};

function parseFilePayload(content: string): ChatFilePayload | null {
  if (!content.startsWith(FILE_MSG_PREFIX)) return null;
  try {
    return JSON.parse(content.slice(FILE_MSG_PREFIX.length)) as ChatFilePayload;
  } catch {
    return null;
  }
}

function extractPathFromSignedUrl(url: string | undefined): string | null {
  if (!url) return null;
  const marker = `/object/sign/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx < 0) return null;
  const encoded = url.slice(idx + marker.length).split("?")[0];
  if (!encoded) return null;
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const content = typeof body?.content === "string" ? body.content.trim() : "";

  if (!content) {
    return NextResponse.json({ error: "Mensaje vacio" }, { status: 400 });
  }

  // Atomic: update only if sender_id matches — avoids TOCTOU race
  const { data: updated, error: updateError } = await admin
    .from("chat_messages")
    .update({ content })
    .eq("id", id)
    .eq("sender_id", user.id)
    .select("id, sender_id, receiver_id, content, created_at, read_at")
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: "No se pudo editar el mensaje" }, { status: 500 });
  }

  if (!updated) {
    return NextResponse.json({ error: "Mensaje no encontrado o no tienes permiso" }, { status: 404 });
  }

  return NextResponse.json({ message: updated });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Fetch only own message atomically
  const { data: msg, error: fetchError } = await admin
    .from("chat_messages")
    .select("id, sender_id, content")
    .eq("id", id)
    .eq("sender_id", user.id)
    .maybeSingle();

  if (fetchError || !msg) {
    return NextResponse.json({ error: "Mensaje no encontrado o no tienes permiso" }, { status: 404 });
  }

  const filePayload = parseFilePayload(msg.content);
  const storagePath = filePayload?.storagePath || extractPathFromSignedUrl(filePayload?.url);

  // Delete message first, then clean storage
  const { error: deleteError } = await admin
    .from("chat_messages")
    .delete()
    .eq("id", id)
    .eq("sender_id", user.id);

  if (deleteError) {
    return NextResponse.json({ error: "No se pudo eliminar el mensaje" }, { status: 500 });
  }

  // Best-effort storage cleanup  
  if (storagePath) {
    await admin.storage.from(BUCKET).remove([storagePath]).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
