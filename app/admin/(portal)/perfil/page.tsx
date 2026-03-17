import { createClient } from '@/utils/supabase/server';
import { User } from 'lucide-react';
import ProfileEditorForm from '@/components/ProfileEditorForm';

export default async function PerfilPage() {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div>No autorizado. Inicie sesión.</div>;
  }

  // Get profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

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

        <ProfileEditorForm initialProfile={profile || {}} />
      </div>
    </div>
  );
}
