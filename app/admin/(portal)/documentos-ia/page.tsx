import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/utils/auth";
import { redirect } from "next/navigation";
import DocumentosIAClient from "./DocumentosIAClient";

export const metadata = { title: "Documentos IA" };

export default async function DocumentosIAPage() {
  const result = await requireAdmin();
  if ("error" in result) redirect("/admin/login");

  const supabase = await createClient();
  const { data: docs } = await supabase
    .from("knowledge_documents")
    .select("*")
    .order("created_at", { ascending: false });

  return <DocumentosIAClient initialDocs={docs || []} />;
}
