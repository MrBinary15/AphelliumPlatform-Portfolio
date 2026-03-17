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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Settings className="h-8 w-8 text-cyan-400" />
          Configuración del Sitio
        </h1>
      </div>

      {!isAdmin && (
        <div className="bg-amber-500/10 border border-amber-500/50 text-amber-200 p-4 rounded-lg flex items-start gap-3 backdrop-blur-sm">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-medium">Acceso Restringido</h3>
            <p className="text-sm opacity-90">
              Parece que tu cuenta no tiene permisos de administrador (Rol: {ROLE_LABELS[auth.role]}). 
              Puedes ver la configuración pero no podrás guardar los cambios. Contacta a un administrador para que te asigne el rol &apos;admin&apos;.
            </p>
          </div>
        </div>
      )}

      <div className="bg-slate-800/50 border border-slate-700/50 p-6 rounded-xl backdrop-blur-sm">
        <form action={handleAction} className="space-y-6">
          
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white border-b border-slate-700 pb-2">
              Página de Inicio (Hero Section)
            </h2>
            
            <div>
              <label htmlFor="hero_title" className="block text-sm font-medium text-slate-300 mb-1">
                {settingsMap['hero_title']?.description || 'Título Principal'}
              </label>
              <input
                type="text"
                id="hero_title"
                name="hero_title"
                defaultValue={settingsMap['hero_title']?.value || ''}
                readOnly={!isAdmin}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all disabled:opacity-50"
              />
            </div>
            
            <div>
              <label htmlFor="hero_description" className="block text-sm font-medium text-slate-300 mb-1">
                {settingsMap['hero_description']?.description || 'Descripción Principal'}
              </label>
              <textarea
                id="hero_description"
                name="hero_description"
                rows={3}
                defaultValue={settingsMap['hero_description']?.value || ''}
                readOnly={!isAdmin}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all disabled:opacity-50"
              ></textarea>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h2 className="text-xl font-semibold text-white border-b border-slate-700 pb-2">
              Información de Contacto
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="contact_email" className="block text-sm font-medium text-slate-300 mb-1">
                  {settingsMap['contact_email']?.description || 'Correo Electrónico'}
                </label>
                <input
                  type="email"
                  id="contact_email"
                  name="contact_email"
                  defaultValue={settingsMap['contact_email']?.value || ''}
                  readOnly={!isAdmin}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all disabled:opacity-50"
                />
              </div>
              
              <div>
                <label htmlFor="contact_phone" className="block text-sm font-medium text-slate-300 mb-1">
                  {settingsMap['contact_phone']?.description || 'Teléfono'}
                </label>
                <input
                  type="text"
                  id="contact_phone"
                  name="contact_phone"
                  defaultValue={settingsMap['contact_phone']?.value || ''}
                  readOnly={!isAdmin}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label htmlFor="contact_location" className="block text-sm font-medium text-slate-300 mb-1">
                {settingsMap['contact_location']?.description || 'Ubicación Física'}
              </label>
              <input
                type="text"
                id="contact_location"
                name="contact_location"
                defaultValue={settingsMap['contact_location']?.value || ''}
                readOnly={!isAdmin}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all disabled:opacity-50"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={!isAdmin}
              className="flex items-center gap-2 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              <Save className="h-5 w-5" />
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
