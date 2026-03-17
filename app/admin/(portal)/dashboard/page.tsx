import { Activity, ShieldCheck, Mail, FolderOpen, ListTodo, BarChart3, Globe, Users, Newspaper, Phone, Briefcase } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [{ count: mensajesCount }, { count: noticiasCount }, { count: proyectosCount }] = await Promise.all([
    supabase.from("mensajes").select("*", { count: "exact", head: true }).eq("status", "unread"),
    supabase.from("noticias").select("*", { count: "exact", head: true }),
    supabase.from("proyectos").select("*", { count: "exact", head: true }),
  ]);

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Dashboard General</h1>
        <p className="text-gray-400 mt-2">Resumen de la actividad en la plataforma APHE.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 font-medium">Noticias Publicadas</h3>
            <div className="p-2 bg-[var(--accent-cyan)]/10 rounded-lg">
              <Activity className="text-[var(--accent-cyan)]" size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold">{noticiasCount ?? 0}</p>
        </div>

        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 font-medium">Mensajes Sin Leer</h3>
            <div className="p-2 bg-[var(--accent-green)]/10 rounded-lg">
              <Mail className="text-[var(--accent-green)]" size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold">{mensajesCount ?? 0}</p>
        </div>

        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 font-medium">Proyectos</h3>
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <FolderOpen className="text-amber-400" size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold">{proyectosCount ?? 0}</p>
        </div>

        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 font-medium">Estado del Sistema</h3>
            <div className="p-2 bg-green-500/10 rounded-lg">
              <ShieldCheck className="text-green-400" size={20} />
            </div>
          </div>
          <p className="text-xl font-bold text-green-400">Óptimo</p>
        </div>
      </div>

      {/* Acceso Rápido — Portal */}
      <div className="mt-12">
        <h2 className="text-xl font-bold mb-4">Acceso Rápido</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/admin/mensajes" className="bg-black/40 border border-white/10 hover:border-[var(--accent-cyan)]/40 rounded-2xl p-6 backdrop-blur-md transition-colors group">
            <Mail className="text-[var(--accent-cyan)] mb-3" size={24} />
            <p className="font-semibold text-white group-hover:text-[var(--accent-cyan)] transition-colors">Ver Mensajes</p>
            <p className="text-sm text-gray-500 mt-1">Administra la bandeja de entrada de contacto</p>
          </Link>
          <Link href="/admin/noticias" className="bg-black/40 border border-white/10 hover:border-[var(--accent-green)]/40 rounded-2xl p-6 backdrop-blur-md transition-colors group">
            <Activity className="text-[var(--accent-green)] mb-3" size={24} />
            <p className="font-semibold text-white group-hover:text-[var(--accent-green)] transition-colors">Gestionar Noticias</p>
            <p className="text-sm text-gray-500 mt-1">Crea o edita artículos del blog corporativo</p>
          </Link>
          <Link href="/admin/proyectos" className="bg-black/40 border border-white/10 hover:border-amber-400/40 rounded-2xl p-6 backdrop-blur-md transition-colors group">
            <FolderOpen className="text-amber-400 mb-3" size={24} />
            <p className="font-semibold text-white group-hover:text-amber-400 transition-colors">Gestionar Proyectos</p>
            <p className="text-sm text-gray-500 mt-1">Administra los proyectos y casos de éxito</p>
          </Link>
          <Link href="/admin/tareas" className="bg-black/40 border border-white/10 hover:border-violet-400/40 rounded-2xl p-6 backdrop-blur-md transition-colors group">
            <ListTodo className="text-violet-400 mb-3" size={24} />
            <p className="font-semibold text-white group-hover:text-violet-400 transition-colors">Tareas</p>
            <p className="text-sm text-gray-500 mt-1">Gestiona tareas y foro del equipo</p>
          </Link>
          <Link href="/admin/estadisticas" className="bg-black/40 border border-white/10 hover:border-pink-400/40 rounded-2xl p-6 backdrop-blur-md transition-colors group">
            <BarChart3 className="text-pink-400 mb-3" size={24} />
            <p className="font-semibold text-white group-hover:text-pink-400 transition-colors">Estadísticas</p>
            <p className="text-sm text-gray-500 mt-1">Métricas y analíticas de la plataforma</p>
          </Link>
        </div>
      </div>

      {/* Acceso Rápido — Página Principal */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Página Principal</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <a href="/" target="_blank" rel="noopener noreferrer" className="bg-black/40 border border-white/10 hover:border-sky-400/40 rounded-2xl p-5 backdrop-blur-md transition-colors group text-center">
            <Globe className="text-sky-400 mx-auto mb-2" size={22} />
            <p className="font-semibold text-sm text-white group-hover:text-sky-400 transition-colors">Inicio</p>
          </a>
          <a href="/nosotros" target="_blank" rel="noopener noreferrer" className="bg-black/40 border border-white/10 hover:border-emerald-400/40 rounded-2xl p-5 backdrop-blur-md transition-colors group text-center">
            <Users className="text-emerald-400 mx-auto mb-2" size={22} />
            <p className="font-semibold text-sm text-white group-hover:text-emerald-400 transition-colors">Nosotros</p>
          </a>
          <a href="/proyectos" target="_blank" rel="noopener noreferrer" className="bg-black/40 border border-white/10 hover:border-amber-400/40 rounded-2xl p-5 backdrop-blur-md transition-colors group text-center">
            <Briefcase className="text-amber-400 mx-auto mb-2" size={22} />
            <p className="font-semibold text-sm text-white group-hover:text-amber-400 transition-colors">Proyectos</p>
          </a>
          <a href="/noticias-principal" target="_blank" rel="noopener noreferrer" className="bg-black/40 border border-white/10 hover:border-[var(--accent-green)]/40 rounded-2xl p-5 backdrop-blur-md transition-colors group text-center">
            <Newspaper className="text-[var(--accent-green)] mx-auto mb-2" size={22} />
            <p className="font-semibold text-sm text-white group-hover:text-[var(--accent-green)] transition-colors">Noticias</p>
          </a>
          <a href="/contacto" target="_blank" rel="noopener noreferrer" className="bg-black/40 border border-white/10 hover:border-[var(--accent-cyan)]/40 rounded-2xl p-5 backdrop-blur-md transition-colors group text-center">
            <Phone className="text-[var(--accent-cyan)] mx-auto mb-2" size={22} />
            <p className="font-semibold text-sm text-white group-hover:text-[var(--accent-cyan)] transition-colors">Contacto</p>
          </a>
        </div>
      </div>
    </div>
  );
}
