'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateSiteSettings(formData: FormData) {
  const supabase = await createClient();

  // Validate user authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'No autorizado.' };
  }

  // Check if user is admin is done by RLS over site_settings

  const settingsToUpdate = [
    { key: 'hero_title', value: formData.get('hero_title')?.toString() || '' },
    { key: 'hero_description', value: formData.get('hero_description')?.toString() || '' },
    { key: 'contact_email', value: formData.get('contact_email')?.toString() || '' },
    { key: 'contact_phone', value: formData.get('contact_phone')?.toString() || '' },
    { key: 'contact_location', value: formData.get('contact_location')?.toString() || '' },
  ];

  let hasError = false;

  for (const setting of settingsToUpdate) {
    if (setting.value !== '') {
        const { error } = await supabase
        .from('site_settings')
        .update({ value: setting.value, updated_at: new Date().toISOString() })
        .eq('key', setting.key);

        if (error) {
            console.error('Error updating setting:', setting.key, error);
            hasError = true;
        }
    }
  }

  if (hasError) {
    return { error: 'Ocurrió un error al actualizar algunas configuraciones. Quizás no tengas permisos de administrador (Rol: admin).' };
  }

  revalidatePath('/');
  revalidatePath('/contacto');
  revalidatePath('/admin/configuracion');

  return { success: 'Configuraciones actualizadas correctamente.' };
}
