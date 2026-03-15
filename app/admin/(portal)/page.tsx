import { Activity, Users, ShieldCheck } from "lucide-react";

export default async function AdminDashboardPage() {
  // Note: Here we would fetch total counts of news, messages, etc.
  
  // Note: Here we would fetch total counts of news, messages, etc.
  
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
          <p className="text-3xl font-bold">0</p>
        </div>
        
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 font-medium">Empleados Registrados</h3>
            <div className="p-2 bg-[var(--accent-green)]/10 rounded-lg">
              <Users className="text-[var(--accent-green)]" size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold">1</p>
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
        <h2 className="text-xl font-bold mb-4">Actividad Reciente</h2>
        <div className="bg-black/40 border border-white/10 rounded-2xl p-8 backdrop-blur-md text-center">
          <p className="text-gray-500">No hay actividad reciente para mostrar todavía.</p>
        </div>
      </div>
    </div>
  );
}
