import { createClient } from "@/utils/supabase/server";
import { Plus, Edit } from "lucide-react";
import Link from "next/link";
import DeleteNoticiaButton from "@/components/DeleteNoticiaButton";

type Noticia = {
  id: string;
  title: string;
  category: string;
  created_at: string;
};

export default async function AdminNoticiasPage() {
  const supabase = await createClient();
  
  const { data: noticias } = await supabase
    .from("noticias")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Gestión de Noticias</h1>
          <p className="text-gray-400 mt-2">Administra el contenido del blog y novedades.</p>
        </div>
        <Link 
          href="/admin/noticias/nueva"
          className="flex items-center gap-2 bg-[var(--accent-cyan)] text-black font-bold px-4 py-2 rounded-xl hover:bg-[var(--accent-cyan)]/90 transition-colors"
        >
          <Plus size={20} />
          Nueva Noticia
        </Link>
      </div>
      
      <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="p-4 font-medium text-gray-400">Título</th>
              <th className="p-4 font-medium text-gray-400">Categoría</th>
              <th className="p-4 font-medium text-gray-400">Fecha</th>
              <th className="p-4 font-medium text-gray-400 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {!noticias || noticias.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  No hay noticias publicadas.
                </td>
              </tr>
            ) : (
              noticias.map((item: Noticia) => (
                <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4 font-medium">{item.title}</td>
                  <td className="p-4">
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs">
                      {item.category || "General"}
                    </span>
                  </td>
                  <td className="p-4 text-gray-400 text-sm">
                    {new Date(item.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2 text-gray-400">
                      <Link href={`/admin/noticias/editar/${item.id}`} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors" title="Editar">
                        <Edit size={16} />
                      </Link>
                      <DeleteNoticiaButton id={item.id} title={item.title} />
                    </div>
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
