import { createClient } from "@/utils/supabase/server";
import { requirePermission } from "@/utils/auth";
import { redirect } from "next/navigation";
import SoporteClient from "./SoporteClient";

export const metadata = { title: "Soporte al Cliente" };

export default async function SoportePage() {
  const result = await requirePermission("view_mensajes");
  if ("error" in result) redirect("/admin/login");

  const supabase = await createClient();
  const { data: conversations } = await supabase
    .from("support_conversations")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(50);

  return (
    <SoporteClient
      initialConversations={conversations || []}
      currentUserId={result.auth.user.id}
      currentUserRole={result.auth.role}
    />
  );
}
