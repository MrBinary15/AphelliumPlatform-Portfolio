import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { LayoutDashboard, Newspaper, Mail as MailIcon, LogOut, Settings, Users, User as UserIcon, FolderOpen, Pencil, Eye, Shield, ClipboardList, BarChart3, Headset, Bot, Video, ChevronRight, ExternalLink } from "lucide-react";
import { getAuthUser } from "@/utils/auth";
import { hasPermission, canModifyContent, ROLE_LABELS } from "@/utils/roles";
import { AdminContentWrapper } from "@/components/AdminContentWrapper";
import MobileAdminNav from "@/components/MobileAdminNav";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const auth = await getAuthUser();
  if (!auth) return null;

  const role = auth.role;
  const roleLabel = ROLE_LABELS[role];

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", auth.user.id).single();
  const displayName = profile?.full_name || auth.user.email?.split("@")[0] || "Admin";

  const RoleBadge = () => {
    if (role === "admin") return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-cyan-400/10 text-cyan-400 border border-cyan-400/20"><Shield size={10} />{roleLabel}</span>;
    if (role === "coordinador") return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-orange-400/10 text-orange-400 border border-orange-400/20"><ClipboardList size={10} />{roleLabel}</span>;
    if (role === "editor") return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"><Pencil size={10} />{roleLabel}</span>;
    if (role === "visitante") return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-purple-400/10 text-purple-300 border border-purple-400/20"><Eye size={10} />{roleLabel}</span>;
    return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-amber-400/10 text-amber-300 border border-amber-400/20"><Eye size={10} />{roleLabel}</span>;
  };

  const linkCls = "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all duration-150 group";
  const iconCls = "shrink-0 opacity-60 group-hover:opacity-100 transition-opacity";
  const sectionLabelCls = "px-3.5 text-[10px] font-bold text-gray-600 uppercase tracking-[0.12em] mb-1.5";

  return (
    <div className="flex min-h-screen md:h-screen bg-[var(--bg-darker)] overflow-hidden md:overflow-hidden">
      {/* ─── Sidebar ─── */}
      <aside className="hidden md:flex w-[260px] shrink-0 border-r border-white/[0.06] flex-col bg-[#060a14]" data-no-inline-edit="true">
        {/* Brand */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-green)] flex items-center justify-center text-black text-xs font-black">A</div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white">{displayName}</h2>
              <p className="text-[10px] text-gray-500 truncate max-w-[160px]">{roleLabel}</p>
            </div>
          </div>
          <div className="mt-3"><RoleBadge /></div>
        </div>

        {/* Nav Sections */}
        <nav className="flex-1 px-3 space-y-5 overflow-y-auto pb-4 mt-1 scrollbar-none">
          {/* Principal */}
          <div>
            <p className={sectionLabelCls}>Principal</p>
            <div className="space-y-0.5">
              <Link href="/admin/dashboard" className={linkCls}>
                <LayoutDashboard size={18} className={iconCls} />
                <span>Dashboard</span>
              </Link>
              <Link href="/admin/noticias" className={linkCls}>
                <Newspaper size={18} className={iconCls} />
                <span>Noticias</span>
              </Link>
              <Link href="/admin/proyectos" className={linkCls}>
                <FolderOpen size={18} className={iconCls} />
                <span>Proyectos</span>
              </Link>
              {hasPermission(role, "view_mensajes") && (
                <Link href="/admin/mensajes" className={linkCls}>
                  <MailIcon size={18} className={iconCls} />
                  <span>Mensajes</span>
                </Link>
              )}
            </div>
          </div>

          {/* Equipo */}
          <div>
            <p className={sectionLabelCls}>Equipo</p>
            <div className="space-y-0.5">
              {hasPermission(role, "view_tasks") && (
                <Link href="/admin/tareas" className={linkCls}>
                  <ClipboardList size={18} className={iconCls} />
                  <span>Tareas</span>
                </Link>
              )}
              {hasPermission(role, "view_tasks") && (
                <Link href="/admin/reuniones" className={linkCls}>
                  <Video size={18} className={iconCls} />
                  <span>Reuniones</span>
                </Link>
              )}
              {hasPermission(role, "view_all_stats") && (
                <Link href="/admin/estadisticas" className={linkCls}>
                  <BarChart3 size={18} className={iconCls} />
                  <span>Estadísticas</span>
                </Link>
              )}
              {role === "admin" && (
                <Link href="/admin/soporte" className={linkCls}>
                  <Headset size={18} className={iconCls} />
                  <span>Soporte</span>
                </Link>
              )}
              {role === "admin" && (
                <Link href="/admin/documentos-ia" className={linkCls}>
                  <Bot size={18} className={iconCls} />
                  <span>Documentos IA</span>
                </Link>
              )}
            </div>
          </div>

          {/* Cuenta */}
          <div>
            <p className={sectionLabelCls}>Cuenta</p>
            <div className="space-y-0.5">
              <Link href="/admin/perfil" className={linkCls}>
                <UserIcon size={18} className={iconCls} />
                <span>Mi Perfil</span>
              </Link>
            </div>
          </div>

          {/* Administración */}
          {hasPermission(role, "manage_users") && (
            <div>
              <p className={sectionLabelCls}>Administración</p>
              <div className="space-y-0.5">
                <Link href="/admin/usuarios" className={linkCls}>
                  <Users size={18} className={iconCls} />
                  <span>Usuarios</span>
                </Link>
                <Link href="/admin/configuracion" className={linkCls}>
                  <Settings size={18} className={iconCls} />
                  <span>Configuración</span>
                </Link>
              </div>
            </div>
          )}
        </nav>

        {/* Footer: Site link + Logout */}
        <div className="px-3 pb-4 pt-2 border-t border-white/[0.06] space-y-2">
          <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition-all">
            <ExternalLink size={14} />
            <span>Ver sitio público</span>
          </a>
          <form action="/auth/signout" method="post">
            <button className="flex w-full items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-500/[0.07] text-red-400 hover:bg-red-500/15 transition-all text-[13px] font-medium border border-red-500/10 hover:border-red-500/20">
              <LogOut size={15} />
              <span>Cerrar Sesión</span>
            </button>
          </form>
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <main className="flex-1 min-w-0 w-full overflow-y-auto relative" style={{ scrollbarGutter: "stable" }}>
        {/* Mobile Header */}
        <div className="md:hidden sticky top-0 z-20 bg-[#060a14]/95 backdrop-blur-xl border-b border-white/[0.06]" data-no-inline-edit="true">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-green)] flex items-center justify-center text-black text-[10px] font-black">A</div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">{displayName}</p>
                <p className="text-[10px] text-gray-500">{roleLabel}</p>
              </div>
            </div>
            <RoleBadge />
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 md:p-8 pb-24 md:pb-8">
          <AdminContentWrapper>{children}</AdminContentWrapper>
        </div>

        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-[var(--accent-cyan)]/[0.03] rounded-full blur-[180px] -z-10 pointer-events-none" />
      </main>

      {/* ─── Mobile Bottom Nav ─── */}
      <MobileAdminNav
        role={role}
        permissions={{
          viewMensajes: hasPermission(role, "view_mensajes"),
          viewTasks: hasPermission(role, "view_tasks"),
          viewAllStats: hasPermission(role, "view_all_stats"),
          manageUsers: hasPermission(role, "manage_users"),
        }}
      />
    </div>
  );
}
