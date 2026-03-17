import { createClient } from "@/utils/supabase/server";
import { normalizeRole, hasPermission, type Role, type Permission } from "@/utils/roles";

export type AuthResult = {
  user: { id: string; email?: string };
  role: Role;
};

/**
 * Get the authenticated user and their normalized role.
 * Returns null if not authenticated.
 */
export async function getAuthUser(): Promise<AuthResult | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return {
    user: { id: user.id, email: user.email },
    role: normalizeRole(profile?.role),
  };
}

/**
 * Require authentication and a specific permission.
 * Returns the auth result or an error object.
 */
export async function requirePermission(
  permission: Permission
): Promise<{ auth: AuthResult } | { error: string }> {
  const auth = await getAuthUser();
  if (!auth) return { error: "No autorizado. Inicia sesión." };
  if (!hasPermission(auth.role, permission)) {
    return { error: "No tienes permisos para realizar esta acción." };
  }
  return { auth };
}

/**
 * Require authentication and admin role.
 */
export async function requireAdmin(): Promise<{ auth: AuthResult } | { error: string }> {
  const auth = await getAuthUser();
  if (!auth) return { error: "No autorizado. Inicia sesión." };
  if (auth.role !== "admin") {
    return { error: "Solo los administradores pueden realizar esta acción." };
  }
  return { auth };
}
