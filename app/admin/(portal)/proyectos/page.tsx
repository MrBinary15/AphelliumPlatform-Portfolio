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
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Proyectos</h1>
          <p className="text-gray-500 mt-1 text-sm">Portafolio de proyectos de Aphellium.</p>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {Object.entries(STATUS_LABELS).map(([key, { label, color }]) => {
          const count = items.filter(p => p.status === key).length;
          return (
            <div key={key} className={`rounded-xl border p-3.5 ${color.split(" ").slice(1).join(" ")}`}>
              <p className={`text-[10px] font-medium ${color.split(" ")[0]}`}>{label}</p>
              <p className="text-xl font-bold mt-0.5">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Project Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              <th className="p-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Proyecto</th>
              <th className="p-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Categoría</th>
              <th className="p-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Estado</th>
              <th className="p-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Ubicación</th>
              <th className="p-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
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
                  <tr key={proyecto.id} className="border-t border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {proyecto.img_url ? (
                          <img
                            src={proyecto.img_url}
                            alt=""
                            className="w-9 h-9 rounded-lg object-cover border border-white/[0.08]"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-600">
                            <Eye size={14} />
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
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <Link
                            href={`/admin/proyectos/editar/${proyecto.id}`}
                            className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors text-gray-500 hover:text-white"
                            title="Editar"
                          >
                            <Edit size={15} />
                          </Link>
                        )}
                        {canDelete && (
                          <form action={handleDelete}>
                            <input type="hidden" name="id" value={proyecto.id} />
                            <button
                              type="submit"
                              className="p-2 hover:bg-red-500/[0.08] rounded-lg transition-colors text-gray-500 hover:text-red-400"
                              title="Eliminar"
                            >
                              <Trash2 size={15} />
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
