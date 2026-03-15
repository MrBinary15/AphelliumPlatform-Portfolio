import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import EditarNoticiaForm from "./EditarNoticiaForm";

export default async function EditarNoticiaPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: noticia } = await supabase
    .from("noticias")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!noticia) {
    redirect("/admin/noticias");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Editar Noticia</h1>
          <p className="text-gray-400 mt-1">Modifica los detalles del artículo.</p>
        </div>
      </div>

      <EditarNoticiaForm noticia={noticia} />
    </div>
  );
}
