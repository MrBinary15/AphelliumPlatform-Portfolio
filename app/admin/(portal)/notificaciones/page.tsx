import { createClient } from "@/utils/supabase/server";
import { getAuthUser } from "@/utils/auth";
import { Bell, CheckCheck, Trash2, Newspaper, FolderOpen, Video, ClipboardList, MessageCircle, Info } from "lucide-react";
import NotificacionesClient from "./NotificacionesClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NotificacionesPage() {
  const auth = await getAuthUser();
  if (!auth?.user) {
    return <div className="p-8 text-center text-gray-500">Inicia sesión para ver tus notificaciones.</div>;
  }

  const supabase = await createClient();

  const [{ data: notifications }, { count: unreadCount }] = await Promise.all([
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", auth.user.id)
      .eq("read", false),
  ]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <Bell className="text-[var(--accent-cyan)]" size={28} />
            Notificaciones
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {unreadCount ? `${unreadCount} sin leer` : "Todas leídas"}
          </p>
        </div>
      </header>

      <NotificacionesClient
        initialNotifications={notifications || []}
        initialUnread={unreadCount ?? 0}
      />
    </div>
  );
}
