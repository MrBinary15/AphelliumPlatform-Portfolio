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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Mi Perfil</h1>
        <p className="text-gray-500 mt-1 text-sm">Información personal y datos públicos del equipo.</p>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 md:p-6">
        <p className="text-gray-500 text-xs mb-5">
          Estos datos se mostrarán en la sección &quot;Quiénes Somos&quot; de la página principal.
        </p>

        <ProfileEditorForm initialProfile={profile || {}} />
      </div>
    </div>
  );
}
