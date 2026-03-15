'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateUserRole(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'No autorizado.' };
  }

  // Double check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { error: 'No tienes permisos para realizar esta acción.' };
  }

  const targetUserId = formData.get('userId')?.toString();
  const newRole = formData.get('role')?.toString();

  if (!targetUserId || !newRole) {
    return { error: 'Faltan datos.' };
  }

  // Prevent users from removing their own admin status accidentally
  if (targetUserId === user.id && newRole !== 'admin') {
    return { error: 'No puedes quitarte tu propio rol de administrador.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', targetUserId);

  if (error) {
    console.error('Error updating user role:', error);
    return { error: 'Error al actualizar el rol.' };
  }

  revalidatePath('/admin/usuarios');
}
