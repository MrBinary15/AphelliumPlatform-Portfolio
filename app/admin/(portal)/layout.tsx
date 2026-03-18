import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { LayoutDashboard, Newspaper, Mail as MailIcon, LogOut, Settings, Users, User as UserIcon, FolderOpen, Pencil, Eye, Shield, ClipboardList, BarChart3, Headset, Bot, Video } from "lucide-react";
import { getAuthUser } from "@/utils/auth";
import { hasPermission, canModifyContent, ROLE_LABELS } from "@/utils/roles";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getAuthUser();
  if (!auth) return null;

  const role = auth.role;
  const roleLabel = ROLE_LABELS[role];

  const RoleBadge = () => {
    if (role === "admin") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan-400/10 text-cyan-400 border border-cyan-400/20"><Shield size={10} />{roleLabel}</span>;
    if (role === "coordinador") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-400/10 text-orange-400 border border-orange-400/20"><ClipboardList size={10} />{roleLabel}</span>;
    if (role === "editor") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"><Pencil size={10} />{roleLabel}</span>;
    if (role === "visitante") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-400/10 text-purple-300 border border-purple-400/20"><Eye size={10} />{roleLabel}</span>;
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-400/10 text-amber-300 border border-amber-400/20"><Eye size={10} />{roleLabel}</span>;
  };

  return (
    <div className="flex min-h-screen md:h-screen bg-[var(--bg-darker)] overflow-hidden md:overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="hidden md:flex w-64 bg-black/50 border-r border-white/5 flex-col">
        <div className="p-6">
          <h2 className="text-xl font-bold tracking-tight text-white">APHE <span className="text-[var(--accent-cyan)]">Admin</span></h2>
          <p className="text-xs text-gray-400 mt-1">{auth.user.email}</p>
          <div className="mt-2"><RoleBadge /></div>
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
          <Link href="/admin/proyectos" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
            <FolderOpen size={20} />
            <span>Proyectos</span>
          </Link>
          {hasPermission(role, "view_mensajes") && (
            <Link href="/admin/mensajes" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
              <MailIcon size={20} />
              <span>Mensajes</span>
            </Link>
          )}

          {hasPermission(role, "view_tasks") && (
            <Link href="/admin/tareas" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
              <ClipboardList size={20} />
              <span>Tareas</span>
            </Link>
          )}

          {hasPermission(role, "view_all_stats") && (
            <Link href="/admin/estadisticas" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
              <BarChart3 size={20} />
              <span>Estadísticas</span>
            </Link>
          )}

          {hasPermission(role, "view_mensajes") && (
            <Link href="/admin/soporte" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
              <Headset size={20} />
              <span>Soporte</span>
            </Link>
          )}

          {hasPermission(role, "view_tasks") && (
            <Link href="/admin/reuniones" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
              <Video size={20} />
              <span>Reuniones</span>
            </Link>
          )}

          {role === "admin" && (
            <Link href="/admin/documentos-ia" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
              <Bot size={20} />
              <span>Documentos IA</span>
            </Link>
          )}
          
          <div className="pt-4 mt-4 border-t border-white/5">
            <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Cuenta</p>
            <Link href="/admin/perfil" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
              <UserIcon size={20} />
              <span>Mi Perfil</span>
            </Link>
          </div>

          {hasPermission(role, "manage_users") && (
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
      <main className="flex-1 w-full overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 relative">
        <div className="md:hidden mb-4 sticky top-0 z-20 bg-[var(--bg-darker)]/90 backdrop-blur border border-white/10 rounded-xl p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-sm font-semibold text-white">APHE Admin</p>
            <div><RoleBadge /></div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Link href="/admin/dashboard" className="shrink-0 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-200">Dashboard</Link>
            <Link href="/admin/noticias" className="shrink-0 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-200">Noticias</Link>
            <Link href="/admin/proyectos" className="shrink-0 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-200">Proyectos</Link>
            {hasPermission(role, "view_tasks") && (
              <Link href="/admin/tareas" className="shrink-0 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-200">Tareas</Link>
            )}
            {hasPermission(role, "view_mensajes") && (
              <Link href="/admin/soporte" className="shrink-0 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-200">Soporte</Link>
            )}
            {hasPermission(role, "view_tasks") && (
              <Link href="/admin/reuniones" className="shrink-0 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-200">Reuniones</Link>
            )}
            {role === "admin" && (
              <Link href="/admin/documentos-ia" className="shrink-0 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-200">Docs IA</Link>
            )}
            <Link href="/admin/perfil" className="shrink-0 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-200">Perfil</Link>
          </div>
        </div>
        {/* Background glow for the content area */}
        <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-[var(--accent-cyan)]/5 rounded-full blur-[150px] -z-10 pointer-events-none"></div>
        {children}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[rgba(2,6,14,0.96)] backdrop-blur-xl supports-[padding:max(0px)]:pb-[max(env(safe-area-inset-bottom),0.4rem)]">
        <div className="grid grid-cols-5 gap-1 px-2 py-2">
          <Link href="/admin/dashboard" className="flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] text-gray-300 hover:text-white hover:bg-white/10">
            <LayoutDashboard size={15} />
            <span>Inicio</span>
          </Link>
          <Link href="/admin/noticias" className="flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] text-gray-300 hover:text-white hover:bg-white/10">
            <Newspaper size={15} />
            <span>Noticias</span>
          </Link>
          <Link href="/admin/proyectos" className="flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] text-gray-300 hover:text-white hover:bg-white/10">
            <FolderOpen size={15} />
            <span>Proyectos</span>
          </Link>
          <Link href="/admin/tareas" className="flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] text-gray-300 hover:text-white hover:bg-white/10">
            <ClipboardList size={15} />
            <span>Tareas</span>
          </Link>
          <Link href="/admin/perfil" className="flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] text-gray-300 hover:text-white hover:bg-white/10">
            <UserIcon size={15} />
            <span>Perfil</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
