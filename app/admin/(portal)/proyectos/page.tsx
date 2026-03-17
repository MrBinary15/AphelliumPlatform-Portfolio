import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { Plus, Edit, Trash2, Star, MapPin, Calendar, Eye } from "lucide-react";
import { deleteProyecto, type Proyecto } from "./actions";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/utils/auth";
import { hasPermission } from "@/utils/roles";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  planning: { label: "Planificación", color: "text-amber-300 bg-amber-500/15 border-amber-400/30" },
  active: { label: "Activo", color: "text-emerald-300 bg-emerald-500/15 border-emerald-400/30" },
  completed: { label: "Completado", color: "text-cyan-300 bg-cyan-500/15 border-cyan-400/30" },
  paused: { label: "Pausado", color: "text-gray-400 bg-gray-500/15 border-gray-400/30" },
};

export default async function AdminProyectosPage() {
  const auth = await getAuthUser();
  const canCreate = auth ? hasPermission(auth.role, "create_proyecto") : false;
  const canEdit = auth ? hasPermission(auth.role, "edit_proyecto") : false;
  const canDelete = auth ? hasPermission(auth.role, "delete_proyecto") : false;

  const supabase = await createClient();

  const { data: proyectos, error } = await supabase
    .from("proyectos")
    .select("*")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  const items = (proyectos || []) as Proyecto[];

  async function handleDelete(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await deleteProyecto(id);
    revalidatePath("/admin/proyectos");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Gestión de Proyectos</h1>
          <p className="text-gray-400 mt-2">Administra el portafolio de proyectos de Aphellium.</p>
        </div>
        {canCreate && (
          <Link
            href="/admin/proyectos/nuevo"
            className="flex items-center gap-2 bg-[var(--accent-cyan)] text-black font-bold px-4 py-2 rounded-xl hover:bg-[var(--accent-cyan)]/90 transition-colors"
          >
            <Plus size={20} />
            Nuevo Proyecto
          </Link>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-400/30 rounded-xl p-4 text-red-300 text-sm">
          Error al cargar proyectos: {error.message}. Asegúrate de que la tabla &quot;proyectos&quot; exista en Supabase.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(STATUS_LABELS).map(([key, { label, color }]) => {
          const count = items.filter(p => p.status === key).length;
          return (
            <div key={key} className={`rounded-xl border p-4 backdrop-blur-md ${color.split(" ").slice(1).join(" ")}`}>
              <p className={`text-xs ${color.split(" ")[0]}`}>{label}</p>
              <p className="text-2xl font-bold mt-1">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Project Table */}
      <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="p-4 font-medium text-gray-400">Proyecto</th>
              <th className="p-4 font-medium text-gray-400 hidden md:table-cell">Categoría</th>
              <th className="p-4 font-medium text-gray-400 hidden md:table-cell">Estado</th>
              <th className="p-4 font-medium text-gray-400 hidden lg:table-cell">Ubicación</th>
              <th className="p-4 font-medium text-gray-400 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  No hay proyectos registrados. ¡Crea el primero!
                </td>
              </tr>
            ) : (
              items.map((proyecto) => {
                const statusInfo = STATUS_LABELS[proyecto.status] || STATUS_LABELS.active;
                return (
                  <tr key={proyecto.id} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {proyecto.img_url ? (
                          <img
                            src={proyecto.img_url}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover border border-white/10"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-500">
                            <Eye size={16} />
                          </div>
                        )}
                        <div>
                          <p className="text-white font-medium flex items-center gap-2">
                            {proyecto.title}
                            {proyecto.featured && <Star size={14} className="text-amber-400 fill-amber-400" />}
                          </p>
                          {proyecto.client_name && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {proyecto.client_type === "propio" ? "🏢 Proyecto propio" : proyecto.client_type === "varios_clientes" ? `👥 ${proyecto.client_name}` : `👤 ${proyecto.client_name}`}
                            </p>
                          )}
                          {!proyecto.client_name && proyecto.client_type === "propio" && (
                            <p className="text-xs text-gray-500 mt-0.5">🏢 Proyecto propio</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      {proyecto.category ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/20">
                          {proyecto.category}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      {proyecto.location ? (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <MapPin size={12} />
                          {proyecto.location}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canEdit && (
                          <Link
                            href={`/admin/proyectos/editar/${proyecto.id}`}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </Link>
                        )}
                        {canDelete && (
                          <form action={handleDelete}>
                            <input type="hidden" name="id" value={proyecto.id} />
                            <button
                              type="submit"
                              className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-gray-400 hover:text-red-400"
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
