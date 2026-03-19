'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/utils/auth';
import { isValidRole, ALL_ROLES, type Role } from '@/utils/roles';

const TEAM_SECTIONS = ['founders', 'coordinator', 'technical'] as const;
type TeamSection = (typeof TEAM_SECTIONS)[number];

function isValidTeamSection(value: string): value is TeamSection {
  return TEAM_SECTIONS.includes(value as TeamSection);
}

export async function updateUserRole(formData: FormData) {
  // --- RBAC: only admins can manage users ---
  const permResult = await requireAdmin();
  if ('error' in permResult) return { error: permResult.error };
  const { auth } = permResult;
  const user = auth.user;

  const admin = createAdminClient();

  const targetUserId = formData.get('userId')?.toString();
  const newRole = formData.get('role')?.toString();

  if (!targetUserId || !newRole) {
    return { error: 'Faltan datos.' };
  }

  // Validate that newRole is a valid role
  if (!isValidRole(newRole)) {
    return { error: `Rol inválido. Los roles válidos son: ${ALL_ROLES.join(', ')}` };
  }

  // Prevent users from removing their own admin status accidentally
  if (targetUserId === user.id && newRole !== 'admin') {
    return { error: 'No puedes quitarte tu propio rol de administrador.' };
  }

  const { error } = await admin
    .from('profiles')
    .update({ role: newRole })
    .eq('id', targetUserId);

  if (error) {
    console.error('Error updating user role:', error);
    return { error: 'Error al actualizar el rol.' };
  }

  revalidatePath('/admin/usuarios');
  return { success: `Rol actualizado a ${newRole}.` };
}

export async function createUser(formData: FormData) {
  // --- RBAC: only admins can create users ---
  const permResult = await requireAdmin();
  if ('error' in permResult) return { error: permResult.error };

  const email = formData.get('email')?.toString()?.trim();
  const password = formData.get('password')?.toString();
  const fullName = formData.get('full_name')?.toString()?.trim() || '';
  const role = (formData.get('role')?.toString() || 'viewer') as Role;
  const teamSectionInput = formData.get('team_section')?.toString() || 'technical';
  const teamSection: TeamSection = isValidTeamSection(teamSectionInput) ? teamSectionInput : 'technical';

  if (!email || !password) {
    return { error: 'Email y contraseña son obligatorios.' };
  }

  if (password.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres.' };
  }

  if (!isValidRole(role)) {
    return { error: `Rol inválido. Los roles válidos son: ${ALL_ROLES.join(', ')}` };
  }

  const admin = createAdminClient();

  // Create user via Supabase Admin API
  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    console.error('Error creating user:', createError);
    if (createError.message?.includes('already been registered')) {
      return { error: 'Ya existe un usuario con ese correo electrónico.' };
    }
    return { error: `Error al crear usuario: ${createError.message}` };
  }

  if (!newUser?.user?.id) {
    return { error: 'No se pudo obtener el ID del usuario creado.' };
  }

  // Create profile with role
  const { error: profileError } = await admin
    .from('profiles')
    .upsert({
      id: newUser.user.id,
      full_name: fullName || null,
      role,
      team_section: teamSection,
    }, { onConflict: 'id' });

  if (profileError) {
    console.error('Error creating profile:', profileError);
    return { error: 'Usuario creado pero hubo un error al asignar el perfil.' };
  }

  revalidatePath('/admin/usuarios');
  return { success: `Usuario ${email} creado exitosamente con rol ${role}.` };
}

export async function updateUserTeamSection(formData: FormData) {
  const permResult = await requireAdmin();
  if ('error' in permResult) return { error: permResult.error };

  const targetUserId = formData.get('userId')?.toString();
  const teamSection = formData.get('team_section')?.toString() || '';

  if (!targetUserId || !teamSection) {
    return { error: 'Faltan datos para actualizar la sección del equipo.' };
  }

  if (!isValidTeamSection(teamSection)) {
    return { error: 'Sección de equipo inválida.' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('profiles')
    .update({ team_section: teamSection })
    .eq('id', targetUserId);

  if (error) {
    console.error('Error updating user team section:', error);
    if (error.message?.toLowerCase().includes('team_section')) {
      return { error: 'No se pudo guardar la sección porque falta la columna team_section. Ejecuta la migración 010_profiles_team_section.sql en Supabase.' };
    }
    return { error: 'Error al actualizar la sección del equipo.' };
  }

  revalidatePath('/admin/usuarios');
  revalidatePath('/nosotros');
  revalidatePath('/');
  return { success: 'Sección de equipo actualizada correctamente.' };
}

export async function deleteUser(formData: FormData) {
  // --- RBAC: only admins can delete users ---
  const permResult = await requireAdmin();
  if ('error' in permResult) return { error: permResult.error };
  const { auth } = permResult;

  const targetUserId = formData.get('userId')?.toString();

  if (!targetUserId) {
    return { error: 'Falta el ID del usuario.' };
  }

  // Prevent admin from deleting themselves
  if (targetUserId === auth.user.id) {
    return { error: 'No puedes eliminar tu propia cuenta.' };
  }

  const admin = createAdminClient();

  // Delete profile first
  await admin.from('profiles').delete().eq('id', targetUserId);

  // Delete auth user
  const { error: authError } = await admin.auth.admin.deleteUser(targetUserId);

  if (authError) {
    console.error('Error deleting user:', authError);
    return { error: `Error al eliminar usuario: ${authError.message}` };
  }

  revalidatePath('/admin/usuarios');
  return { success: 'Usuario eliminado exitosamente.' };
}

export async function saveTeamOrder(formData: FormData) {
  const permResult = await requireAdmin();
  if ('error' in permResult) return { error: permResult.error };

  const rawIds = formData.get('orderedIds')?.toString() || '';
  const orderedIds = rawIds
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  if (orderedIds.length === 0) {
    return { error: 'No se recibio un orden valido.' };
  }

  const admin = createAdminClient();

  for (let i = 0; i < orderedIds.length; i += 1) {
    const id = orderedIds[i];
    const { error } = await admin
      .from('profiles')
      .update({ team_order: i + 1 })
      .eq('id', id);

    if (error) {
      console.error('Error updating team_order:', error);
      if (error.message?.toLowerCase().includes('team_order')) {
        return { error: 'No se pudo guardar el orden porque falta la columna team_order en la base de datos. Ejecuta la migracion 009_profiles_team_order.sql en Supabase.' };
      }
      return { error: 'No se pudo guardar el nuevo orden del equipo.' };
    }
  }

  revalidatePath('/admin/usuarios');
  revalidatePath('/nosotros');
  return { success: 'Orden del equipo actualizado.' };
}
