'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { bilingualFromSource } from '@/utils/autoTranslate';
import { requireAdmin } from '@/utils/auth';

export async function updateSiteSettings(formData: FormData) {
  // --- RBAC: only admins can manage settings ---
  const permResult = await requireAdmin();
  if ('error' in permResult) return { error: permResult.error };

  const supabase = await createClient();

  const heroTitle = formData.get('hero_title')?.toString() || '';
  const heroDescription = formData.get('hero_description')?.toString() || '';

  const heroTitleBilingual = heroTitle ? await bilingualFromSource(heroTitle) : null;
  const heroDescriptionBilingual = heroDescription ? await bilingualFromSource(heroDescription) : null;

  const settingsToUpdate = [
    { key: 'hero_title', value: formData.get('hero_title')?.toString() || '' },
    { key: 'hero_description', value: formData.get('hero_description')?.toString() || '' },
    { key: 'hero_title_es', value: heroTitleBilingual?.es || '' },
    { key: 'hero_title_en', value: heroTitleBilingual?.en || '' },
    { key: 'hero_description_es', value: heroDescriptionBilingual?.es || '' },
    { key: 'hero_description_en', value: heroDescriptionBilingual?.en || '' },
    { key: 'contact_email', value: formData.get('contact_email')?.toString() || '' },
    { key: 'contact_phone', value: formData.get('contact_phone')?.toString() || '' },
    { key: 'contact_location', value: formData.get('contact_location')?.toString() || '' },
  ];

  let hasError = false;

  for (const setting of settingsToUpdate) {
    if (setting.value !== '') {
        const now = new Date().toISOString();
        const { error } = await supabase
          .from('site_settings')
          .upsert({ key: setting.key, value: setting.value, updated_at: now }, { onConflict: 'key' });

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
