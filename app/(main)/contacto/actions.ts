"use server";

import { createAdminClient } from "@/utils/supabase/admin";

export async function submitContactMessage(formData: FormData) {
  const supabase = createAdminClient();

  const name = (formData.get("name") as string)?.trim();
  const company = (formData.get("company") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const topic = (formData.get("topic") as string)?.trim();
  const message = (formData.get("message") as string)?.trim();

  if (!name || !email || !message) {
    return { error: "Por favor, completa los campos requeridos." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: "Por favor, ingresa un correo electrónico válido." };
  }

  const { error } = await supabase.from("mensajes").insert({
    name,
    company: company || null,
    email,
    topic: topic || "Consulta General",
    message,
    status: "unread",
  });

  if (error) {
    console.error("Error inserting message:", error);
    return { error: "Ocurrió un error al enviar tu mensaje. Inténtalo de nuevo." };
  }

  return { success: true };
}
