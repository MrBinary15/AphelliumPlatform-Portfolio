'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/utils/auth';
import { isValidRole, ALL_ROLES, type Role } from '@/utils/roles';

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
    }, { onConflict: 'id' });

  if (profileError) {
    console.error('Error creating profile:', profileError);
    return { error: 'Usuario creado pero hubo un error al asignar el perfil.' };
  }

  revalidatePath('/admin/usuarios');
  return { success: `Usuario ${email} creado exitosamente con rol ${role}.` };
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
