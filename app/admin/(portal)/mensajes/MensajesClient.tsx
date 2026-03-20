"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Mail,
  Clock,
  CheckCircle,
  Search,
  User,
  Building,
  Tag,
  AlertCircle,
  Trash2,
} from "lucide-react";

type Mensaje = {
  id: string;
  status: string;
  name: string;
  company: string;
  email: string;
  topic: string;
  message: string;
  created_at: string;
};

export default function MensajesClient({
  mensajes: initialMensajes,
  currentUserRole,
}: {
  mensajes: Mensaje[];
  supportConversations?: unknown[];
  currentUserId: string;
  currentUserRole: string;
}) {
  const [mensajes, setMensajes] = useState<Mensaje[]>(initialMensajes);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  const unreadCorreos = mensajes.filter((m) => m.status === "unread").length;

  const filteredMensajes = useMemo(() => {
    if (!search.trim()) return mensajes;
    const q = search.toLowerCase();
    return mensajes.filter(
      (m) =>
        m.name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.topic?.toLowerCase().includes(q) ||
        m.message?.toLowerCase().includes(q) ||
        m.company?.toLowerCase().includes(q)
    );
  }, [mensajes, search]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Eliminar este mensaje permanentemente?")) return;
    setDeleting((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/mensajes/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMensajes((prev) => prev.filter((m) => m.id !== id));
      } else {
        alert("No se pudo eliminar el mensaje");
      }
    } catch {
      alert("Error de conexión");
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          Mensajes
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Bandeja de consultas y contactos.
        </p>
      </div>

      {/* Stats pill */}
      <div className="flex gap-2">
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/25">
          <Mail size={15} />
          <span>Correos</span>
          {unreadCorreos > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-[var(--accent-cyan)] text-black text-[10px] font-bold rounded-full min-w-[18px] text-center">
              {unreadCorreos}
            </span>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600"
        />
        <input
          type="text"
          placeholder="Buscar por nombre, correo, tema..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm placeholder:text-gray-600 focus:outline-none focus:border-[var(--accent-cyan)]/30 transition-colors"
        />
      </div>

      {/* Content */}
      <CorreosList mensajes={filteredMensajes} onDelete={handleDelete} deleting={deleting} canDelete={currentUserRole === "admin" || currentUserRole === "coordinador"} />
    </div>
  );
}

/* ----- Correos List ----- */

function CorreosList({ mensajes, onDelete, deleting, canDelete }: { mensajes: Mensaje[]; onDelete: (id: string) => void; deleting: Set<string>; canDelete: boolean }) {
  if (mensajes.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
        <AlertCircle size={28} className="mx-auto mb-3 text-gray-700" />
        <p className="text-gray-600 text-sm font-medium">
          No hay mensajes en la bandeja.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {mensajes.map((msg) => (
        <div
          key={msg.id}
          className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all group flex items-center gap-2"
        >
          <Link
            href={`/admin/mensajes/${msg.id}`}
            className="flex-1 min-w-0 block"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {/* Status + Sender */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  {msg.status === "unread" ? (
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent-cyan)] animate-pulse" />
                  ) : (
                    <CheckCircle size={16} className="text-gray-600" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`font-semibold text-sm truncate ${
                        msg.status === "unread" ? "text-white" : "text-gray-300"
                      }`}
                    >
                      {msg.name}
                    </span>
                    {msg.company && (
                      <span className="hidden sm:flex items-center gap-1 text-[11px] text-gray-500">
                        <Building size={11} />
                        {msg.company}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {msg.email}
                  </p>
                </div>
              </div>

              {/* Topic + Message preview */}
              <div className="flex-1 min-w-0 pl-6 sm:pl-0">
                {msg.topic && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/10 rounded-full text-[11px] text-gray-400 mb-1">
                    <Tag size={10} />
                    {msg.topic}
                  </span>
                )}
                <p className="text-xs text-gray-500 truncate">{msg.message}</p>
              </div>

              {/* Date */}
              <div className="flex items-center gap-2 text-[11px] text-gray-600 pl-6 sm:pl-0 flex-shrink-0">
                <Clock size={12} />
                {new Date(msg.created_at).toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "short",
                })}
              </div>
            </div>
          </Link>

          {/* Delete button */}
          {canDelete && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); onDelete(msg.id); }}
              disabled={deleting.has(msg.id)}
              className="shrink-0 p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30"
              title="Eliminar mensaje"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
