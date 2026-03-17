import { redirect } from "next/navigation";
import { requirePermission } from "@/utils/auth";

export default async function NuevaNoticiaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await requirePermission("create_noticia");
  if ("error" in result) redirect("/admin/noticias");
  return <>{children}</>;
}
