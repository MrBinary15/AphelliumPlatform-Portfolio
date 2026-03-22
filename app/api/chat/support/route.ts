import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { rateLimit, getClientIp } from "@/utils/rateLimit";

// POST: Create a new support conversation (visitor) or send a message
// GET: Get messages for a conversation (visitor polling)
export async function POST(request: NextRequest) {
  // Rate limit: 30 requests per minute per IP
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`support:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  let body: {
    action?: string;
    visitorId?: string;
    visitorName?: string;
    conversationId?: string;
    content?: string;
    escalatedFromAi?: boolean;
    aiTranscript?: { role?: string; content?: string; timestamp?: string }[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (body.action === "create") {
    const visitorId = body.visitorId?.trim();
    if (!visitorId || visitorId.length < 10 || visitorId.length > 100) {
      return NextResponse.json({ error: "ID de visitante inválido" }, { status: 400 });
    }

    // Check for existing open conversation
    const { data: existing } = await supabase
      .from("support_conversations")
      .select("id")
      .eq("visitor_id", visitorId)
      .eq("status", "open")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ conversationId: existing.id });
    }

    const { data, error } = await supabase
      .from("support_conversations")
      .insert({
        visitor_id: visitorId,
        visitor_name: (body.visitorName || "Visitante").slice(0, 50),
        escalated_from_ai: body.escalatedFromAi || false,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Create support conversation error:", error);
      return NextResponse.json({ error: "No se pudo crear la conversación" }, { status: 500 });
    }

    // Add system message
    await supabase.from("support_messages").insert({
      conversation_id: data.id,
      sender_type: "system",
      content: body.escalatedFromAi
        ? "El asistente de IA ha transferido esta conversación a soporte humano."
        : "Nueva conversación de soporte iniciada.",
    });

    if (body.escalatedFromAi && Array.isArray(body.aiTranscript) && body.aiTranscript.length > 0) {
      const compact = body.aiTranscript
        .slice(-14)
        .map((m) => {
          const who = m.role === "assistant" ? "IA" : "Cliente";
          const text = (m.content || "").toString().trim();
          return text ? `${who}: ${text}` : "";
        })
        .filter(Boolean)
        .join("\n");

      if (compact) {
        await supabase.from("support_messages").insert({
          conversation_id: data.id,
          sender_type: "system",
          content: `Contexto previo de IA:\n${compact}`,
        });
      }
    }

    return NextResponse.json({ conversationId: data.id });
  }

  if (body.action === "send") {
    const conversationId = body.conversationId?.trim();
    const content = body.content?.trim();
    const visitorId = body.visitorId?.trim();

    if (!conversationId || !content || !visitorId) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: "Mensaje demasiado largo" }, { status: 400 });
    }

    // Verify conversation belongs to this visitor
    const { data: conv } = await supabase
      .from("support_conversations")
      .select("id, status")
      .eq("id", conversationId)
      .eq("visitor_id", visitorId)
      .single();

    if (!conv) {
      return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
    }

    if (conv.status === "closed") {
      return NextResponse.json({ error: "Esta conversación ha sido cerrada" }, { status: 400 });
    }

    const { error } = await supabase.from("support_messages").insert({
      conversation_id: conversationId,
      sender_type: "visitor",
      sender_id: visitorId,
      content,
    });

    if (error) {
      console.error("Send support message error:", error);
      return NextResponse.json({ error: "No se pudo enviar el mensaje" }, { status: 500 });
    }

    // Update conversation timestamp
    await supabase.from("support_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
}

// GET: Visitor polls for messages
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const conversationId = url.searchParams.get("conversationId");
  const visitorId = url.searchParams.get("visitorId");
  const after = url.searchParams.get("after"); // ISO timestamp for polling

  if (!conversationId || !visitorId) {
    return NextResponse.json({ error: "Parámetros faltantes" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Verify conversation belongs to this visitor
  const { data: conv } = await supabase
    .from("support_conversations")
    .select("id, status")
    .eq("id", conversationId)
    .eq("visitor_id", visitorId)
    .single();

  if (!conv) {
    return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
  }

  let query = supabase
    .from("support_messages")
    .select("id, sender_type, sender_id, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (after) {
    query = query.gt("created_at", after);
  } else {
    query = query.limit(100);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Fetch support messages error:", error);
    return NextResponse.json({ error: "Error al obtener mensajes" }, { status: 500 });
  }

  return NextResponse.json({ messages: data || [], status: conv.status });
}
