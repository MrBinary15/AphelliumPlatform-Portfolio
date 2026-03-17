"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Correo y contraseña son requeridos" };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "Credenciales incorrectas o error de conexión" };
  }

  revalidatePath("/admin", "layout");
  redirect("/admin/dashboard");
}

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get("email") as string;

  if (!email) {
    return { error: "El correo es requerido" };
  }

  const headerList = await headers();
  const origin = headerList.get("origin") || headerList.get("x-forwarded-host") || "";

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/admin/reset-password`,
  });

  if (error) {
    return { error: "Error al enviar el correo. Intenta de nuevo." };
  }

  // Always return success to avoid revealing whether the email exists
  return { success: true };
}
