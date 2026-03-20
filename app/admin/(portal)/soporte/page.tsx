import { createClient } from "@/utils/supabase/server";
import { getAuthUser } from "@/utils/auth";
import { redirect } from "next/navigation";
import SoporteClient from "./SoporteClient";

export const metadata = { title: "Soporte al Cliente" };

export default async function SoportePage() {
  const auth = await getAuthUser();
  if (!auth || auth.role !== "admin") redirect("/admin/dashboard");

  const supabase = await createClient();
  const { data: conversations } = await supabase
    .from("support_conversations")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(50);

  return (
    <SoporteClient
      initialConversations={conversations || []}
      currentUserId={auth.user.id}
      currentUserRole={auth.role}
    />
  );
}
