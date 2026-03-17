import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import EditarProyectoForm from "./EditarProyectoForm";
import { requirePermission } from "@/utils/auth";

export default async function EditarProyectoPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  // --- RBAC: require edit_proyecto permission ---
  const permResult = await requirePermission("edit_proyecto");
  if ("error" in permResult) redirect("/admin/proyectos");

  const supabase = await createClient();

  const { data: proyecto, error } = await supabase
    .from("proyectos")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !proyecto) {
    notFound();
  }

  return <EditarProyectoForm proyecto={proyecto} />;
}
