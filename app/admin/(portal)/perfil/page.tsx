import { createClient } from '@/utils/supabase/server';
import { updateProfile } from '../../actions/perfil';
import { User, Save, Upload } from 'lucide-react';

export default async function PerfilPage() {
  const supabase = await createClient();

  // Get session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return <div>No autorizado. Inicie sesión.</div>;
  }

  // Get profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  // Wrapper for server action
  const handleUpdate = async (formData: FormData) => {
    "use server";
    await updateProfile(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <User className="h-8 w-8 text-cyan-400" />
          Mi Perfil
        </h1>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 p-6 rounded-xl backdrop-blur-sm">
        <p className="text-slate-400 text-sm mb-6">
          Actualiza tu información personal. Estos datos se mostrarán en la sección &quot;Quiénes Somos&quot; de la página principal.
        </p>

        <form action={handleUpdate} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Avatar Area */}
          <div className="col-span-1 flex flex-col items-center space-y-4">
            <div className="w-40 h-40 rounded-full bg-slate-900 border-2 border-slate-700 overflow-hidden relative group">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="Tu Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">
                  <User size={64} />
                </div>
              )}
              {/* Overlay on hover */}
              <label htmlFor="avatar_file" className="absolute inset-0 bg-black/50 flex-col items-center justify-center text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity flex">
                <Upload size={24} className="mb-2" />
                <span className="text-sm font-medium">Cambiar</span>
              </label>
            </div>
            
            <input 
              type="file" 
              id="avatar_file" 
              name="avatar_file" 
              accept="image/*" 
              className="hidden" 
            />
            <p className="text-xs text-slate-500 text-center">
              Recomendado: Imagen cuadrada de al menos 400x400 px. Se subirá guardando los cambios.
            </p>
          </div>

          {/* Form Fields Area */}
          <div className="col-span-1 md:col-span-2 space-y-4">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-slate-300 mb-1">
                Nombre Completo
              </label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                defaultValue={profile?.full_name || ''}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                placeholder="Ej. Juan Pérez"
              />
            </div>
            
            <div>
              <label htmlFor="job_title" className="block text-sm font-medium text-slate-300 mb-1">
                Puesto / Cargo en la Empresa
              </label>
              <input
                type="text"
                id="job_title"
                name="job_title"
                defaultValue={profile?.job_title || ''}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                placeholder="Ej. Desarrollador de Software"
              />
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-1">
                Descripción (Biografía)
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                defaultValue={profile?.description || ''}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                placeholder="Escribe algo sobre ti, tu rol en la empresa y experiencia..."
              ></textarea>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:shadow-[0_0_20px_rgba(34,211,238,0.5)]"
              >
                <Save className="h-5 w-5" />
                Guardar Perfil
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
