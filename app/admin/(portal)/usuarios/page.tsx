import { createClient } from '@/utils/supabase/server';
import { Users, Shield, User, AlertCircle } from 'lucide-react';
import { updateUserRole } from '../../actions/usuarios';

export default async function UsuariosPage() {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return <div>No autorizado. Inicie sesión.</div>;
  }

  // Check if current user is admin
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  const isAdmin = currentProfile?.role === 'admin';

  // Fetch all profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching profiles:', error);
  }

  const handleUpdateRole = async (formData: FormData) => {
    "use server";
    await updateUserRole(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Users className="h-8 w-8 text-cyan-400" />
          Gestión de Usuarios
        </h1>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 p-6 rounded-xl backdrop-blur-sm">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white">Cuentas Registradas</h2>
          <p className="text-slate-400 text-sm mt-1">
            Aquí puedes ver todos los empleados registrados y asignarles el rol de administrador.
          </p>
        </div>

        {!isAdmin && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/50 text-amber-200 p-4 rounded-lg flex items-start gap-3 backdrop-blur-sm">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-medium">Acceso Restringido</h3>
              <p className="text-sm opacity-90">
                Solo los administradores pueden cambiar los roles de los usuarios.
              </p>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-slate-300">
            <thead className="text-xs uppercase bg-slate-900/50 text-slate-400">
              <tr>
                <th scope="col" className="px-6 py-3 rounded-tl-lg">Usuario</th>
                <th scope="col" className="px-6 py-3">Rol Actual</th>
                <th scope="col" className="px-6 py-3 rounded-tr-lg">Acción (Asignar Rol)</th>
              </tr>
            </thead>
            <tbody>
              {profiles && profiles.length > 0 ? (
                profiles.map((profile) => (
                  <tr key={profile.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-slate-400" />
                        </div>
                      )}
                      <div>
                        <p>{profile.full_name || 'Sin Nombre'}</p>
                        <p className="text-xs text-slate-400 font-normal opacity-50">ID: {profile.id}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {profile.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
                          <Shield className="h-3 w-3" /> Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-300">
                          <User className="h-3 w-3" /> Empleado
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <form action={handleUpdateRole} className="flex items-center gap-2">
                        <input type="hidden" name="userId" value={profile.id} />
                        <select
                          name="role"
                          disabled={!isAdmin || profile.id === session.user.id}
                          defaultValue={profile.role || 'employee'}
                          className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block p-2 outline-none disabled:opacity-50"
                        >
                          <option value="employee">Empleado</option>
                          <option value="admin">Administrador</option>
                        </select>
                        <button
                          type="submit"
                          disabled={!isAdmin || profile.id === session.user.id}
                          className="px-3 py-2 text-xs font-medium text-white bg-slate-700 hover:bg-slate-600 rounded-lg disabled:opacity-50 transition-colors"
                        >
                          Actualizar
                        </button>
                      </form>
                      {profile.id === session.user.id && isAdmin && (
                        <p className="text-xs text-amber-500/70 mt-1">Es tu cuenta actual</p>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                    No hay usuarios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
