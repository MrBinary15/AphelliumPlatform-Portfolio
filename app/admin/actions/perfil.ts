'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'No autorizado.' };
  }

  const fullName = formData.get('full_name')?.toString();
  const bio = formData.get('description')?.toString();
  const jobTitle = formData.get('job_title')?.toString();
  const avatarFile = formData.get('avatar_file') as File | null;

  let avatarUrl: string | undefined = undefined;

  // Handle avatar upload if provided
  if (avatarFile && avatarFile.size > 0 && avatarFile.name !== 'undefined') {
    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${user.id}-${Math.random()}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, avatarFile, { upsert: true });

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError);
      return { error: 'Error al subir la imagen.' };
    }

    if (uploadData?.path) {
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(uploadData.path);
      avatarUrl = publicUrlData.publicUrl;
    }
  }

  // Update profile
  type ProfileUpdate = {
    full_name?: string;
    description?: string;
    job_title?: string;
    avatar_url?: string;
  };

  const updates: ProfileUpdate = {};
  if (fullName !== undefined) updates.full_name = fullName;
  if (bio !== undefined) updates.description = bio;
  if (jobTitle !== undefined) updates.job_title = jobTitle;
  if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (error) {
    console.error('Error updating profile:', error);
    return { error: 'Error al actualizar el perfil.' };
  }

  revalidatePath('/admin/perfil');
  revalidatePath('/nosotros'); // Revalidate the public about us page so the changes reflect

  return { success: 'Perfil actualizado correctamente.' };
}
