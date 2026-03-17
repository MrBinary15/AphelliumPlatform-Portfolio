import { createClient } from "@/utils/supabase/server";
import { CheckCircle, Clock } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/utils/auth";

type Mensaje = {
  id: string;
  status: string;
  name: string;
  company: string;
  email: string;
  topic: string;
  message: string;
  created_at: string;
};

export default async function AdminMensajesPage() {
  // --- RBAC: require view_mensajes permission ---
  const permResult = await requirePermission("view_mensajes");
  if ("error" in permResult) redirect("/admin/dashboard");

  const supabase = await createClient();

  const { data: mensajes } = await supabase
    .from("mensajes")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Centro de Mensajes</h1>
        <p className="text-gray-400 mt-2">Bandeja de entrada de consultas y contactos corporativos.</p>
      </div>
      
      <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="p-4 font-medium text-gray-400">Estado</th>
              <th className="p-4 font-medium text-gray-400">Remitente</th>
              <th className="p-4 font-medium text-gray-400">Asunto / Tema</th>
              <th className="p-4 font-medium text-gray-400">Fecha</th>
              <th className="p-4 font-medium text-gray-400 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {!mensajes || mensajes.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  No hay mensajes en la bandeja de entrada.
                </td>
              </tr>
            ) : (
              mensajes.map((msg: Mensaje) => (
                <tr key={msg.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    {msg.status === "unread" ? (
                      <span className="flex items-center gap-1 text-[var(--accent-cyan)] text-sm font-medium">
                        <Clock size={16} /> Nuevo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-500 text-sm">
                        <CheckCircle size={16} /> Leído
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="font-medium">{msg.name}</div>
                    <div className="text-sm text-gray-400">{msg.company || msg.email}</div>
                  </td>
                  <td className="p-4">
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs mb-2 inline-block">
                      {msg.topic || "Consulta General"}
                    </span>
                    <p className="text-sm text-gray-300 truncate max-w-xs">{msg.message}</p>
                  </td>
                  <td className="p-4 text-gray-400 text-sm">
                    {new Date(msg.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <Link href={`/admin/mensajes/${msg.id}`} className="px-4 py-2 border border-[var(--accent-cyan)]/30 rounded-xl text-sm font-medium text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/10 transition-colors inline-block">
                      Ver Detalles
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
