import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { requirePermission } from "@/utils/auth";
import MensajesClient from "./MensajesClient";

export const metadata = { title: "Centro de Mensajes" };

export default async function AdminMensajesPage() {
  const permResult = await requirePermission("view_mensajes");
  if ("error" in permResult) redirect("/admin/dashboard");

  const supabase = await createClient();

  const { data: mensajes } = await supabase
    .from("mensajes")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: supportConvs } = await supabase
    .from("support_conversations")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(50);

  return (
    <MensajesClient
      mensajes={mensajes || []}
      supportConversations={supportConvs || []}
      currentUserId={permResult.auth.user.id}
      currentUserRole={permResult.auth.role}
    />
  );
}
