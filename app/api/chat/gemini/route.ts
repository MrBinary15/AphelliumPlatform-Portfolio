import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

type GeminiMessage = {
  role: "user" | "model";
  parts: { text: string }[];
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

function buildSystemPrompt(knowledgeBase: string): string {
  return `Eres el asistente virtual de Aphellium, una empresa de tecnología de enfriamiento sustentable.

SOBRE APHELLIUM:
- Aphellium desarrolla tecnología avanzada de eco-enfriamiento pasivo híbrido.
- Integra nanotecnología, inteligencia artificial y blockchain para logística sustentable en floricultura.
- Ubicados en Ecuador, al servicio de la industria floricultora internacional.

TU ROL:
- Responde preguntas sobre Aphellium, sus productos, servicios y tecnología.
- Sé amable, profesional y conciso en español.
- Si el usuario tiene un problema técnico complejo que NO puedes resolver, o solicita atención personalizada, responde EXACTAMENTE con el marcador [ESCALATE] al final de tu mensaje para que un asesor humano tome la conversación.
- NO inventes información. Si no sabes algo sobre Aphellium, di que no tienes esa información y ofrece conectar con un asesor.

BASE DE CONOCIMIENTO:
${knowledgeBase || "No hay documentos de conocimiento cargados todavía. Responde con lo que sabes sobre Aphellium."}

REGLAS:
- Responde siempre en español a menos que el usuario escriba en otro idioma.
- Máximo 300 palabras por respuesta.
- No compartas información interna o confidencial.
- Si detectas que el usuario necesita ayuda urgente o un problema que no puedes resolver, incluye [ESCALATE] al final.`;
}

async function fetchKnowledgeBase(): Promise<string> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("knowledge_documents")
      .select("title, content, category")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!data || data.length === 0) return "";

    return data
      .map((doc: { title: string; content: string; category: string }) => 
        `--- ${doc.title} (${doc.category}) ---\n${doc.content}`
      )
      .join("\n\n");
  } catch {
    return "";
  }
}

export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "API de IA no configurada" }, { status: 500 });
  }

  let body: { messages?: { role: string; content: string }[]; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400 });
  }

  const userMessage = body.message?.trim();
  const history = body.messages || [];

  if (!userMessage) {
    return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
  }

  if (userMessage.length > 2000) {
    return NextResponse.json({ error: "Mensaje demasiado largo (máx. 2000 caracteres)" }, { status: 400 });
  }

  const knowledgeBase = await fetchKnowledgeBase();
  const systemPrompt = buildSystemPrompt(knowledgeBase);

  const contents: GeminiMessage[] = [];

  // Add conversation history (last 20 messages max)
  const recentHistory = history.slice(-20);
  for (const msg of recentHistory) {
    contents.push({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    });
  }

  // Add current user message
  contents.push({
    role: "user",
    parts: [{ text: userMessage }],
  });

  try {
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
          topP: 0.9,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", response.status, errText);
      return NextResponse.json({ error: "Error al comunicarse con la IA" }, { status: 502 });
    }

    const data = await response.json();
    const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No pude generar una respuesta.";

    const shouldEscalate = aiText.includes("[ESCALATE]");
    const cleanText = aiText.replace(/\[ESCALATE\]/g, "").trim();

    return NextResponse.json({
      reply: cleanText,
      escalate: shouldEscalate,
    });
  } catch (error) {
    console.error("Gemini request failed:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
