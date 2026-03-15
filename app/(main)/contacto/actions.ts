"use server";

import { createClient } from "@/utils/supabase/server";

export async function submitContactMessage(formData: FormData) {
  const supabase = await createClient();

  const name = formData.get("name") as string;
  const company = formData.get("company") as string;
  const email = formData.get("email") as string;
  const topic = formData.get("topic") as string;
  const message = formData.get("message") as string;

  if (!name || !email || !message) {
    return { error: "Por favor, completa los campos requeridos." };
  }

  const { error } = await supabase.from("mensajes").insert({
    name,
    company,
    email,
    topic,
    message,
    status: "unread",
  });

  if (error) {
    console.error("Error inserting message:", error);
    return { error: "Ocurrió un error al enviar tu mensaje. Inténtalo de nuevo." };
  }

  return { success: true };
}
