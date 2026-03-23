import { Activity, ShieldCheck, Mail, FolderOpen, ListTodo, BarChart3, Globe, Users, Newspaper, Phone, Briefcase, ArrowUpRight, TrendingUp, ChevronRight } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import Link from "next/link";
import { getAuthUser } from "@/utils/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const auth = await getAuthUser();

  const [{ count: mensajesCount }, { count: noticiasCount }, { count: proyectosCount }, { data: profile }] = await Promise.all([
    admin.from("mensajes").select("*", { count: "exact", head: true }).eq("status", "unread"),
    admin.from("noticias").select("*", { count: "exact", head: true }),
    admin.from("proyectos").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("full_name").eq("id", auth?.user?.id ?? "").single(),
  ]);

  const firstName = profile?.full_name || auth?.user?.email?.split("@")[0] || "Admin";

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <header>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          Bienvenido, <span className="bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-green)] bg-clip-text text-transparent">{firstName}</span>
        </h1>
        <p className="text-gray-500 mt-1 text-sm">Resumen de la actividad en la plataforma.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Link href="/admin/noticias" className="group admin-card p-5 hover:border-[var(--accent-cyan)]/30">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-cyan)]/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-[var(--accent-cyan)]/10">
                <Activity className="text-[var(--accent-cyan)]" size={18} />
              </div>
              <ChevronRight size={14} className="text-gray-600 group-hover:text-[var(--accent-cyan)] transition-colors" />
            </div>
            <p className="text-2xl md:text-3xl font-bold tracking-tight">{noticiasCount ?? 0}</p>
            <p className="text-[11px] text-gray-500 font-medium mt-1">Noticias Publicadas</p>
          </div>
        </Link>

        <Link href="/admin/mensajes" className="group admin-card p-5 hover:border-[var(--accent-green)]/30">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-green)]/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-[var(--accent-green)]/10">
                <Mail className="text-[var(--accent-green)]" size={18} />
              </div>
              {(mensajesCount ?? 0) > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--accent-green)]/10 text-[var(--accent-green)] text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] animate-pulse" />
                  Nuevos
                </span>
              )}
            </div>
            <p className="text-2xl md:text-3xl font-bold tracking-tight">{mensajesCount ?? 0}</p>
            <p className="text-[11px] text-gray-500 font-medium mt-1">Mensajes Sin Leer</p>
          </div>
        </Link>

        <Link href="/admin/proyectos" className="group admin-card p-5 hover:border-amber-400/30">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-amber-500/10">
                <FolderOpen className="text-amber-400" size={18} />
              </div>
              <ChevronRight size={14} className="text-gray-600 group-hover:text-amber-400 transition-colors" />
            </div>
            <p className="text-2xl md:text-3xl font-bold tracking-tight">{proyectosCount ?? 0}</p>
            <p className="text-[11px] text-gray-500 font-medium mt-1">Proyectos Activos</p>
          </div>
        </Link>

        <div className="admin-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-emerald-500/10">
              <ShieldCheck className="text-emerald-400" size={18} />
            </div>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Activo
            </span>
          </div>
          <p className="text-lg font-bold text-emerald-400">Óptimo</p>
          <p className="text-[11px] text-gray-500 font-medium mt-1">Estado del Sistema</p>
        </div>
      </div>

      {/* Quick Actions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-200">Acceso Rápido</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { href: "/admin/mensajes", icon: Mail, color: "cyan", label: "Mensajes", desc: "Bandeja de entrada de contacto" },
            { href: "/admin/noticias", icon: Newspaper, color: "green", label: "Noticias", desc: "Artículos del blog corporativo" },
            { href: "/admin/proyectos", icon: FolderOpen, color: "amber", label: "Proyectos", desc: "Proyectos y casos de éxito" },
            { href: "/admin/tareas", icon: ListTodo, color: "violet", label: "Tareas", desc: "Gestión de tareas del equipo" },
            { href: "/admin/estadisticas", icon: BarChart3, color: "pink", label: "Estadísticas", desc: "Métricas de la plataforma" },
            { href: "/admin/reuniones", icon: TrendingUp, color: "sky", label: "Reuniones", desc: "Reuniones y videollamadas" },
          ].map((item) => {
            const colorMap: Record<string, string> = {
              cyan: "var(--accent-cyan)",
              green: "var(--accent-green)",
              amber: "#fbbf24",
              violet: "#a78bfa",
              pink: "#f472b6",
              sky: "#38bdf8",
            };
            const accent = colorMap[item.color] ?? "var(--accent-cyan)";
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group admin-card flex items-center gap-4 p-4 hover:bg-white/[0.04] hover:border-white/[0.12]"
              >
                <div className="shrink-0 p-2.5 rounded-xl" style={{ backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)` }}>
                  <item.icon size={20} style={{ color: accent }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors">{item.label}</p>
                  <p className="text-[11px] text-gray-600 mt-0.5 truncate">{item.desc}</p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-gray-700 group-hover:text-gray-400 transition-colors" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* Public Site Links */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-base font-bold text-gray-200">Sitio Público</h2>
          <ArrowUpRight size={14} className="text-gray-600" />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {[
            { href: "/", icon: Globe, color: "#38bdf8", label: "Inicio" },
            { href: "/nosotros", icon: Users, color: "#34d399", label: "Nosotros" },
            { href: "/proyectos", icon: Briefcase, color: "#fbbf24", label: "Proyectos" },
            { href: "/noticias-principal", icon: Newspaper, color: "var(--accent-green)", label: "Noticias" },
            { href: "/contacto", icon: Phone, color: "var(--accent-cyan)", label: "Contacto" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-2 admin-card py-4 px-2 hover:bg-white/[0.04] hover:border-white/[0.1]"
            >
              <item.icon size={20} style={{ color: item.color }} className="opacity-70 group-hover:opacity-100 transition-opacity" />
              <span className="text-[11px] font-medium text-gray-500 group-hover:text-gray-300 transition-colors">{item.label}</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
