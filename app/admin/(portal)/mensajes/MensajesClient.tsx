"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Mail,
  MessageCircle,
  Clock,
  CheckCircle,
  Search,
  User,
  Building,
  Tag,
  AlertCircle,
  Headset,
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

type SupportConversation = {
  id: string;
  visitor_id: string;
  visitor_name: string;
  status: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
};

type Tab = "correos" | "chat";

export default function MensajesClient({
  mensajes,
  supportConversations,
  currentUserRole,
}: {
  mensajes: Mensaje[];
  supportConversations: SupportConversation[];
  currentUserId: string;
  currentUserRole: string;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("correos");
  const [search, setSearch] = useState("");

  const unreadCorreos = mensajes.filter((m) => m.status === "unread").length;
  const openChats = supportConversations.filter(
    (c) => c.status === "open" || c.status === "assigned"
  ).length;

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

  const filteredConvs = useMemo(() => {
    if (!search.trim()) return supportConversations;
    const q = search.toLowerCase();
    return supportConversations.filter(
      (c) =>
        c.visitor_name?.toLowerCase().includes(q) ||
        c.visitor_id?.toLowerCase().includes(q) ||
        c.status?.toLowerCase().includes(q)
    );
  }, [supportConversations, search]);

  const statusLabel = (s: string) => {
    switch (s) {
      case "open":
        return "Abierto";
      case "assigned":
        return "Asignado";
      case "closed":
        return "Cerrado";
      default:
        return s;
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "open":
        return "text-yellow-400";
      case "assigned":
        return "text-[var(--accent-cyan)]";
      case "closed":
        return "text-gray-500";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Centro de Mensajes
        </h1>
        <p className="text-gray-400 mt-1 text-sm sm:text-base">
          Bandeja de entrada de consultas, contactos y soporte.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("correos")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "correos"
              ? "bg-[var(--accent-cyan)]/15 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/30"
              : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
          }`}
        >
          <Mail size={16} />
          <span className="hidden sm:inline">Correos</span>
          {unreadCorreos > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-[var(--accent-cyan)] text-black text-[10px] font-bold rounded-full min-w-[18px] text-center">
              {unreadCorreos}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "chat"
              ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
              : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
          }`}
        >
          <Headset size={16} />
          <span className="hidden sm:inline">Soporte Chat</span>
          {openChats > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-purple-500 text-white text-[10px] font-bold rounded-full min-w-[18px] text-center">
              {openChats}
            </span>
          )}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
        />
        <input
          type="text"
          placeholder={
            activeTab === "correos"
              ? "Buscar por nombre, correo, tema..."
              : "Buscar por visitante, estado..."
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm placeholder:text-gray-500 focus:outline-none focus:border-[var(--accent-cyan)]/40"
        />
      </div>

      {/* Content */}
      {activeTab === "correos" ? (
        <CorreosList mensajes={filteredMensajes} />
      ) : (
        <ChatList
          conversations={filteredConvs}
          statusLabel={statusLabel}
          statusColor={statusColor}
          currentUserRole={currentUserRole}
        />
      )}
    </div>
  );
}

/* ----- Correos List ----- */

function CorreosList({ mensajes }: { mensajes: Mensaje[] }) {
  if (mensajes.length === 0) {
    return (
      <div className="bg-black/40 border border-white/10 rounded-2xl p-10 text-center">
        <AlertCircle size={32} className="mx-auto mb-3 text-gray-600" />
        <p className="text-gray-500 font-medium">
          No hay mensajes en la bandeja.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {mensajes.map((msg) => (
        <Link
          key={msg.id}
          href={`/admin/mensajes/${msg.id}`}
          className="block bg-black/40 border border-white/10 rounded-2xl p-4 sm:p-5 hover:bg-white/5 transition-colors group"
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
      ))}
    </div>
  );
}

/* ----- Chat Support List ----- */

function ChatList({
  conversations,
  statusLabel,
  statusColor,
  currentUserRole,
}: {
  conversations: SupportConversation[];
  statusLabel: (s: string) => string;
  statusColor: (s: string) => string;
  currentUserRole: string;
}) {
  if (conversations.length === 0) {
    return (
      <div className="bg-black/40 border border-white/10 rounded-2xl p-10 text-center">
        <MessageCircle size={32} className="mx-auto mb-3 text-gray-600" />
        <p className="text-gray-500 font-medium">
          No hay conversaciones de soporte.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {conversations.map((conv) => (
        <Link
          key={conv.id}
          href="/admin/soporte"
          className="block bg-black/40 border border-white/10 rounded-2xl p-4 sm:p-5 hover:bg-white/5 transition-colors group"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Status indicator */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0">
                {conv.status === "open" ? (
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse" />
                ) : conv.status === "assigned" ? (
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent-cyan)]" />
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-600" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <User size={13} className="text-gray-500" />
                  <span className="font-semibold text-sm text-gray-200 truncate">
                    {conv.visitor_name || "Visitante"}
                  </span>
                  <span
                    className={`text-[11px] font-medium ${statusColor(
                      conv.status
                    )}`}
                  >
                    • {statusLabel(conv.status)}
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 mt-0.5">
                  ID: {conv.visitor_id?.slice(0, 8)}...
                </p>
              </div>
            </div>

            {/* Date */}
            <div className="flex items-center gap-2 text-[11px] text-gray-600 pl-6 sm:pl-0 flex-shrink-0">
              <Clock size={12} />
              {new Date(conv.updated_at || conv.created_at).toLocaleDateString(
                "es-ES",
                { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }
              )}
            </div>
          </div>
        </Link>
      ))}

      {/* Link to full Soporte page for admins */}
      {(currentUserRole === "admin" || currentUserRole === "coordinador") && (
        <Link
          href="/admin/soporte"
          className="block text-center py-3 text-sm text-[var(--accent-cyan)] font-semibold hover:underline"
        >
          Ir al Panel de Soporte completo →
        </Link>
      )}
    </div>
  );
}
