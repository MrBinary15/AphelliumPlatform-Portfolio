import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { LayoutDashboard, Newspaper, Mail as MailIcon, LogOut, Settings, Users, User as UserIcon } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch current user role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single();

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="flex h-screen bg-[var(--bg-darker)] overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-black/50 border-r border-white/5 flex flex-col">
        <div className="p-6">
          <h2 className="text-xl font-bold tracking-tight text-white">APHE <span className="text-[var(--accent-cyan)]">Admin</span></h2>
          <p className="text-xs text-gray-400 mt-1">{user?.email}</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          <Link href="/admin/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </Link>
          <Link href="/admin/noticias" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
            <Newspaper size={20} />
            <span>Noticias</span>
          </Link>
          <Link href="/admin/mensajes" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
            <MailIcon size={20} />
            <span>Mensajes</span>
          </Link>
          
          <div className="pt-4 mt-4 border-t border-white/5">
            <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Cuenta</p>
            <Link href="/admin/perfil" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
              <UserIcon size={20} />
              <span>Mi Perfil</span>
            </Link>
          </div>

          {isAdmin && (
            <div className="pt-4 mt-4 border-t border-white/5">
              <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Administración</p>
              <Link href="/admin/usuarios" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
                <Users size={20} />
                <span>Usuarios</span>
              </Link>
              <Link href="/admin/configuracion" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
                <Settings size={20} />
                <span>Configuración</span>
              </Link>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-white/5">
          <form action="/auth/signout" method="post">
            <button className="flex w-full items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
              <LogOut size={16} />
              <span className="text-sm font-medium">Cerrar Sesión</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8 relative">
        {/* Background glow for the content area */}
        <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-[var(--accent-cyan)]/5 rounded-full blur-[150px] -z-10 pointer-events-none"></div>
        {children}
      </main>
    </div>
  );
}
