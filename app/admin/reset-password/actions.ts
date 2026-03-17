"use server";

import { createClient } from "@/utils/supabase/server";

export async function updatePassword(formData: FormData) {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    return { error: "Todos los campos son requeridos" };
  }

  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres" };
  }

  if (password !== confirmPassword) {
    return { error: "Las contraseñas no coinciden" };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sesión no válida. Solicita un nuevo enlace de recuperación." };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: "No se pudo actualizar la contraseña. Intenta de nuevo." };
  }

  return { success: true };
}
