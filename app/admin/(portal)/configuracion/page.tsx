import { createClient } from '@/utils/supabase/server';
import { updateSiteSettings } from '../../actions/configuracion';
import { Settings, Save, AlertCircle } from 'lucide-react';
import { getAuthUser } from '@/utils/auth';
import { isAdmin as checkIsAdmin, ROLE_LABELS } from '@/utils/roles';

export default async function ConfigurationPage() {
  const auth = await getAuthUser();

  if (!auth) {
    return <div>No autorizado. Inicie sesión.</div>;
  }

  const isAdmin = checkIsAdmin(auth.role);
  const supabase = await createClient();

  // Fetch current settings
  const { data: settings } = await supabase.from('site_settings').select('*');

  // Convert array to object for easy access
  const settingsMap = settings?.reduce((acc, curr) => {
    acc[curr.key] = curr;
    return acc;
  }, {} as Record<string, { key: string; value: string; description: string | null; updated_at: string }>) || {};

  // Wrapper function to satisfy TypeScript for Server Actions passed to form action
  const handleAction = async (formData: FormData) => {
    "use server";
    await updateSiteSettings(formData);
  };

  const inputCls = "w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:border-[var(--accent-cyan)]/30 transition-colors read-only:opacity-60";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Configuración</h1>
        <p className="text-gray-500 mt-1 text-sm">Ajustes generales del sitio web.</p>
      </div>

      {!isAdmin && (
        <div className="bg-amber-500/[0.06] border border-amber-500/20 text-amber-300 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold">Acceso Restringido</h3>
            <p className="text-xs opacity-80 mt-0.5">
              Rol actual: {ROLE_LABELS[auth.role]}. Solo administradores pueden guardar cambios.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 md:p-6">
        <form action={handleAction} className="space-y-6">
          
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-200 pb-2 border-b border-white/[0.06]">
              Página de Inicio (Hero)
            </h2>
            
            <div>
              <label htmlFor="hero_title" className="block text-xs font-medium text-gray-400 mb-1">
                {settingsMap['hero_title']?.description || 'Título Principal'}
              </label>
              <input
                type="text"
                id="hero_title"
                name="hero_title"
                defaultValue={settingsMap['hero_title']?.value || ''}
                readOnly={!isAdmin}
                className={inputCls}
              />
            </div>
            
            <div>
              <label htmlFor="hero_description" className="block text-xs font-medium text-gray-400 mb-1">
                {settingsMap['hero_description']?.description || 'Descripción Principal'}
              </label>
              <textarea
                id="hero_description"
                name="hero_description"
                rows={3}
                defaultValue={settingsMap['hero_description']?.value || ''}
                readOnly={!isAdmin}
                className={inputCls}
              ></textarea>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h2 className="text-sm font-semibold text-gray-200 pb-2 border-b border-white/[0.06]">
              Información de Contacto
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="contact_email" className="block text-xs font-medium text-gray-400 mb-1">
                  {settingsMap['contact_email']?.description || 'Correo Electrónico'}
                </label>
                <input
                  type="email"
                  id="contact_email"
                  name="contact_email"
                  defaultValue={settingsMap['contact_email']?.value || ''}
                  readOnly={!isAdmin}
                  className={inputCls}
                />
              </div>
              
              <div>
                <label htmlFor="contact_phone" className="block text-xs font-medium text-gray-400 mb-1">
                  {settingsMap['contact_phone']?.description || 'Teléfono'}
                </label>
                <input
                  type="text"
                  id="contact_phone"
                  name="contact_phone"
                  defaultValue={settingsMap['contact_phone']?.value || ''}
                  readOnly={!isAdmin}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label htmlFor="contact_location" className="block text-xs font-medium text-gray-400 mb-1">
                {settingsMap['contact_location']?.description || 'Ubicación Física'}
              </label>
              <input
                type="text"
                id="contact_location"
                name="contact_location"
                defaultValue={settingsMap['contact_location']?.value || ''}
                readOnly={!isAdmin}
                className={inputCls}
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              type="submit"
              disabled={!isAdmin}
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/90 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold text-sm rounded-xl transition-colors"
            >
              <Save className="h-4 w-4" />
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
