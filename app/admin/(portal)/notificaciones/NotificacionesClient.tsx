"use client";

import { useState, useTransition } from "react";
import { Bell, CheckCheck, Trash2, Newspaper, FolderOpen, Video, ClipboardList, MessageCircle, Info, Check, Filter } from "lucide-react";
import { useRouter } from "next/navigation";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  url: string | null;
  read: boolean;
  created_at: string;
};

const typeConfig: Record<string, { icon: typeof Bell; color: string; label: string }> = {
  noticia:  { icon: Newspaper,      color: "text-[var(--accent-cyan)]",  label: "Noticia" },
  proyecto: { icon: FolderOpen,     color: "text-amber-400",             label: "Proyecto" },
  meeting:  { icon: Video,          color: "text-purple-400",            label: "Reunión" },
  task:     { icon: ClipboardList,  color: "text-[var(--accent-green)]", label: "Tarea" },
  message:  { icon: MessageCircle,  color: "text-blue-400",              label: "Mensaje" },
  general:  { icon: Info,           color: "text-gray-400",              label: "General" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `hace ${days}d`;
  return new Date(dateStr).toLocaleDateString("es");
}

export default function NotificacionesClient({
  initialNotifications,
  initialUnread,
}: {
  initialNotifications: Notification[];
  initialUnread: number;
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filtered = filter === "unread"
    ? notifications.filter((n) => !n.read)
    : notifications;

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markAllRead() {
    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    if (res.ok) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  }

  async function markRead(id: string) {
    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    if (res.ok) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    }
  }

  async function deleteNotification(id: string) {
    const res = await fetch("/api/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    if (res.ok) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  }

  async function deleteAll() {
    const res = await fetch("/api/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    if (res.ok) {
      setNotifications([]);
    }
  }

  function handleClick(notif: Notification) {
    if (!notif.read) markRead(notif.id);
    if (notif.url) {
      startTransition(() => router.push(notif.url!));
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilter(filter === "all" ? "unread" : "all")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 hover:border-[var(--accent-cyan)]/30 transition-colors"
        >
          <Filter size={13} />
          {filter === "all" ? "Mostrar sin leer" : "Mostrar todas"}
          {unreadCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] text-[10px] font-bold">
              {unreadCount}
            </span>
          )}
        </button>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 hover:border-[var(--accent-green)]/30 transition-colors"
          >
            <CheckCheck size={13} />
            Marcar todas leídas
          </button>
        )}

        {notifications.length > 0 && (
          <button
            onClick={deleteAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 hover:border-red-400/30 text-red-400 transition-colors ml-auto"
          >
            <Trash2 size={13} />
            Eliminar todas
          </button>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="admin-card p-12 text-center">
          <Bell size={40} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-500 text-sm">
            {filter === "unread" ? "No hay notificaciones sin leer." : "No hay notificaciones."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((notif) => {
            const cfg = typeConfig[notif.type] || typeConfig.general;
            const Icon = cfg.icon;
            return (
              <div
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={`admin-card p-4 flex items-start gap-3 cursor-pointer transition-all hover:border-[var(--accent-cyan)]/20 ${
                  !notif.read ? "border-l-2 border-l-[var(--accent-cyan)]" : "opacity-70"
                }`}
              >
                <div className={`p-2 rounded-xl bg-white/5 flex-shrink-0 ${cfg.color}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <span className="text-[10px] text-gray-600">{timeAgo(notif.created_at)}</span>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-[var(--accent-cyan)] flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm font-medium mt-0.5 truncate">{notif.title}</p>
                  {notif.body && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.body}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!notif.read && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markRead(notif.id); }}
                      className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-[var(--accent-green)] transition-colors"
                      title="Marcar leída"
                    >
                      <Check size={14} />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-red-400 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
