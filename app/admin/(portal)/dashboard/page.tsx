import { Activity, Users, ShieldCheck, Mail } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [{ count: mensajesCount }, { count: noticiasCount }] = await Promise.all([
    supabase.from("mensajes").select("*", { count: "exact", head: true }).eq("status", "unread"),
    supabase.from("noticias").select("*", { count: "exact", head: true }),
  ]);

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Dashboard General</h1>
        <p className="text-gray-400 mt-2">Resumen de la actividad en la plataforma APHE.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            <h3 className="text-gray-400 font-medium">Estado del Sistema</h3>
            <div className="p-2 bg-green-500/10 rounded-lg">
              <ShieldCheck className="text-green-400" size={20} />
            </div>
          </div>
          <p className="text-xl font-bold text-green-400">Óptimo</p>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-xl font-bold mb-4">Acceso Rápido</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
      </div>
    </div>
  );
}
