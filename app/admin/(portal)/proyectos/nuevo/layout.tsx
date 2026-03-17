import { redirect } from "next/navigation";
import { requirePermission } from "@/utils/auth";

export default async function NuevoProyectoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await requirePermission("create_proyecto");
  if ("error" in result) redirect("/admin/proyectos");
  return <>{children}</>;
}
