/**
 * Role-Based Access Control (RBAC) for Aphellium Platform
 *
 * Roles:
 *   admin       – Full access: manage users, settings, CRUD on all content, view messages, tasks
 *   coordinador – Can create/edit noticias & proyectos, manage tasks & planning. NO users, NO settings.
 *   editor      – Can create/edit/delete noticias & proyectos, view messages
 *   viewer      – Read-only dashboard, can edit own profile & chat. Appears as team member.
 *   visitante   – Same as viewer but does NOT appear in the public "Nuestro Equipo" section.
 */

export type Role = "admin" | "coordinador" | "editor" | "viewer" | "visitante";

export type Permission =
  | "manage_users"
  | "manage_settings"
  | "create_noticia"
  | "edit_noticia"
  | "delete_noticia"
  | "create_proyecto"
  | "edit_proyecto"
  | "delete_proyecto"
  | "view_dashboard"
  | "view_noticias"
  | "view_proyectos"
  | "view_mensajes"
  | "edit_own_profile"
  | "use_chat"
  | "use_floating_panel"
  | "manage_tasks"
  | "view_tasks"
  | "view_all_stats"
  | "view_own_stats";

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: [
    "manage_users",
    "manage_settings",
    "create_noticia",
    "edit_noticia",
    "delete_noticia",
    "create_proyecto",
    "edit_proyecto",
    "delete_proyecto",
    "view_dashboard",
    "view_noticias",
    "view_proyectos",
    "view_mensajes",
    "edit_own_profile",
    "use_chat",
    "use_floating_panel",
    "manage_tasks",
    "view_tasks",
    "view_all_stats",
    "view_own_stats",
  ],
  coordinador: [
    "create_noticia",
    "edit_noticia",
    "delete_noticia",
    "create_proyecto",
    "edit_proyecto",
    "delete_proyecto",
    "view_dashboard",
    "view_noticias",
    "view_proyectos",
    "view_mensajes",
    "edit_own_profile",
    "use_chat",
    "use_floating_panel",
    "manage_tasks",
    "view_tasks",
    "view_all_stats",
    "view_own_stats",
  ],
  editor: [
    "create_noticia",
    "edit_noticia",
    "delete_noticia",
    "create_proyecto",
    "edit_proyecto",
    "delete_proyecto",
    "view_dashboard",
    "view_noticias",
    "view_proyectos",
    "view_mensajes",
    "edit_own_profile",
    "use_chat",
    "use_floating_panel",
    "view_tasks",
    "view_own_stats",
  ],
  viewer: [
    "view_dashboard",
    "view_noticias",
    "view_proyectos",
    "edit_own_profile",
    "use_chat",
    "view_tasks",
    "view_own_stats",
  ],
  visitante: [
    "view_dashboard",
    "view_noticias",
    "view_proyectos",
    "edit_own_profile",
    "use_chat",
    "view_tasks",
    "view_own_stats",
  ],
};

/** All valid roles in descending order of privilege */
export const ALL_ROLES: readonly Role[] = ["admin", "coordinador", "editor", "viewer", "visitante"] as const;

/** Roles that appear as team members on the public "Nosotros" page */
export const TEAM_VISIBLE_ROLES: readonly Role[] = ["admin", "coordinador", "editor", "viewer"] as const;

/** Human-readable labels for each role */
export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  coordinador: "Coordinador",
  editor: "Editor",
  viewer: "Visor",
  visitante: "Visitante",
};

/** Short description for each role */
export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin: "Acceso total: gestión de usuarios, configuración, contenido y mensajes.",
  coordinador: "Gestiona tareas, planificación y contenido. No gestiona usuarios ni configuración.",
  editor: "Puede crear, editar y eliminar noticias y proyectos. Ve mensajes.",
  viewer: "Solo lectura: ve el panel pero no modifica contenido. Aparece en Nuestro Equipo.",
  visitante: "Igual que Visor pero NO aparece como miembro del equipo en la página pública.",
};

/** Check if a role string is a valid Role */
export function isValidRole(role: string | null | undefined): role is Role {
  return role === "admin" || role === "coordinador" || role === "editor" || role === "viewer" || role === "visitante";
}

/** Normalize legacy roles (e.g. "employee" → "viewer") */
export function normalizeRole(role: string | null | undefined): Role {
  if (role === "admin") return "admin";
  if (role === "coordinador") return "coordinador";
  if (role === "editor") return "editor";
  if (role === "visitante") return "visitante";
  // "employee" and anything else defaults to "viewer"
  return "viewer";
}

/** Check if a role should be visible on the public team page */
export function isTeamVisible(role: string | null | undefined): boolean {
  const normalized = normalizeRole(role);
  return (TEAM_VISIBLE_ROLES as readonly string[]).includes(normalized);
}

/** Check if a role has a specific permission */
export function hasPermission(role: Role | string | null | undefined, permission: Permission): boolean {
  const normalized = normalizeRole(role);
  return ROLE_PERMISSIONS[normalized].includes(permission);
}

/** Check if a role has ALL of the specified permissions */
export function hasAllPermissions(role: Role | string | null | undefined, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/** Check if a role has ANY of the specified permissions */
export function hasAnyPermission(role: Role | string | null | undefined, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/** Get all permissions for a role */
export function getPermissions(role: Role | string | null | undefined): readonly Permission[] {
  return ROLE_PERMISSIONS[normalizeRole(role)];
}

/** Check if user is admin */
export function isAdmin(role: string | null | undefined): boolean {
  return normalizeRole(role) === "admin";
}

/** Check if user can modify content (admin, coordinador or editor) */
export function canModifyContent(role: string | null | undefined): boolean {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "coordinador" || normalized === "editor";
}
