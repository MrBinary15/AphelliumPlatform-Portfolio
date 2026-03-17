"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  Headset,
  Send,
  ArrowLeft,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  Bot,
  User,
  RefreshCw,
} from "lucide-react";

type Conversation = {
  id: string;
  visitor_id: string;
  visitor_name: string;
  status: "open" | "assigned" | "closed";
  assigned_to: string | null;
  escalated_from_ai: boolean;
  created_at: string;
  updated_at: string;
};

type SupportMsg = {
  id: string;
  conversation_id: string;
  sender_type: "visitor" | "agent" | "ai" | "system";
  sender_id: string | null;
  content: string;
  created_at: string;
};

export default function SoporteClient({
  initialConversations,
  currentUserId,
  currentUserRole,
}: {
  initialConversations: Conversation[];
  currentUserId: string;
  currentUserRole: string;
}) {
  const supabase = createClient();
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<SupportMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "assigned" | "closed">("all");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async (convId: string) => {
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);
  }, [supabase]);

  const openConversation = async (conv: Conversation) => {
    setActiveConv(conv);
    await loadMessages(conv.id);

    // Auto-assign if open and I'm admin/coordinador
    if (conv.status === "open" && (currentUserRole === "admin" || currentUserRole === "coordinador")) {
      await supabase
        .from("support_conversations")
        .update({ status: "assigned", assigned_to: currentUserId, updated_at: new Date().toISOString() })
        .eq("id", conv.id);

      setConversations((prev) =>
        prev.map((c) => c.id === conv.id ? { ...c, status: "assigned" as const, assigned_to: currentUserId } : c)
      );
      setActiveConv((prev) => prev ? { ...prev, status: "assigned" as const, assigned_to: currentUserId } : prev);
    }
  };

  const sendReply = async () => {
    const content = draft.trim();
    if (!content || !activeConv) return;

    const optimistic: SupportMsg = {
      id: crypto.randomUUID(),
      conversation_id: activeConv.id,
      sender_type: "agent",
      sender_id: currentUserId,
      content,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);
    setDraft("");

    await supabase.from("support_messages").insert({
      conversation_id: activeConv.id,
      sender_type: "agent",
      sender_id: currentUserId,
      content,
    });

    await supabase
      .from("support_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", activeConv.id);
  };

  const closeConversation = async () => {
    if (!activeConv) return;
    if (!window.confirm("¿Cerrar esta conversación?")) return;

    await supabase
      .from("support_conversations")
      .update({ status: "closed", updated_at: new Date().toISOString() })
      .eq("id", activeConv.id);

    await supabase.from("support_messages").insert({
      conversation_id: activeConv.id,
      sender_type: "system",
      content: "Conversación cerrada por el agente.",
    });

    setConversations((prev) =>
      prev.map((c) => c.id === activeConv.id ? { ...c, status: "closed" as const } : c)
    );
    setActiveConv((prev) => prev ? { ...prev, status: "closed" as const } : prev);
  };

  // Realtime subscription for new messages
  useEffect(() => {
    if (!activeConv) return;

    const channel = supabase
      .channel(`support-msg-${activeConv.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `conversation_id=eq.${activeConv.id}` },
        (payload) => {
          const msg = payload.new as SupportMsg;
          // Skip our own agent messages (already optimistic)
          if (msg.sender_type === "agent" && msg.sender_id === currentUserId) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, activeConv, currentUserId]);

  // Realtime subscription for new conversations
  useEffect(() => {
    const channel = supabase
      .channel("support-convs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_conversations" },
        (payload) => {
          const conv = payload.new as Conversation;
          setConversations((prev) => [conv, ...prev.filter((c) => c.id !== conv.id)]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const refreshConversations = async () => {
    const { data } = await supabase
      .from("support_conversations")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (data) setConversations(data);
  };

  const filteredConvs = conversations.filter((c) => {
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (searchQ && !c.visitor_name.toLowerCase().includes(searchQ.toLowerCase()) && !c.visitor_id.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });

  const statusIcon = (s: string) => {
    if (s === "open") return <Clock size={12} className="text-amber-400" />;
    if (s === "assigned") return <Headset size={12} className="text-cyan-400" />;
    return <CheckCircle size={12} className="text-emerald-400" />;
  };

  const statusLabel = (s: string) => {
    if (s === "open") return "Abierta";
    if (s === "assigned") return "Asignada";
    return "Cerrada";
  };

  const fmtTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60_000) return "ahora";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
    if (diff < 86_400_000) return d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("es", { day: "2-digit", month: "short" });
  };

  if (activeConv) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => { setActiveConv(null); setMessages([]); }}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              {statusIcon(activeConv.status)}
              {activeConv.visitor_name}
              {activeConv.escalated_from_ai && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-400/20">
                  <Bot size={10} className="inline mr-1" />Escalada de IA
                </span>
              )}
            </h2>
            <p className="text-xs text-gray-500">{statusLabel(activeConv.status)} · {fmtTime(activeConv.created_at)}</p>
          </div>
          {activeConv.status !== "closed" && (
            <button
              type="button"
              onClick={closeConversation}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-red-500/10 text-red-300 border border-red-400/20 hover:bg-red-500/20 transition-colors"
            >
              <XCircle size={14} /> Cerrar
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] flex flex-col" style={{ height: "calc(100vh - 220px)", minHeight: 400 }}>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_type === "agent" ? "justify-end" : msg.sender_type === "system" ? "justify-center" : "justify-start"}`}
              >
                {msg.sender_type === "system" ? (
                  <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                    <p className="text-[10px] text-gray-400">{msg.content}</p>
                  </div>
                ) : (
                  <div className={`max-w-[75%] flex flex-col ${msg.sender_type === "agent" ? "items-end" : "items-start"}`}>
                    <span className="text-[10px] text-gray-500 mb-1 px-1 flex items-center gap-1">
                      {msg.sender_type === "visitor" ? <><User size={10} /> Visitante</> : msg.sender_type === "ai" ? <><Bot size={10} /> IA</> : <><Headset size={10} /> Agente</>}
                    </span>
                    <div className={`px-3 py-2 text-sm leading-relaxed break-words shadow-lg ${
                      msg.sender_type === "agent"
                        ? "bg-gradient-to-br from-emerald-400/30 to-emerald-500/15 text-white rounded-2xl rounded-br-md border border-emerald-300/20"
                        : "bg-white/[0.06] text-gray-100 rounded-2xl rounded-bl-md border border-white/10"
                    }`}>
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-gray-600 mt-1 px-1">{fmtTime(msg.created_at)}</span>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {activeConv.status !== "closed" ? (
            <div className="px-4 py-3 border-t border-white/10 bg-black/30 shrink-0">
              <div className="flex items-center gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendReply();
                    }
                  }}
                  placeholder="Responder al visitante..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-emerald-400/50"
                />
                <button
                  type="button"
                  onClick={sendReply}
                  disabled={!draft.trim()}
                  className="h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors disabled:opacity-30"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 border-t border-white/10 bg-black/30 text-center">
              <p className="text-xs text-gray-500">Esta conversación está cerrada</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Headset size={28} className="text-emerald-400" /> Soporte al Cliente
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Conversaciones de visitantes que necesitan ayuda
          </p>
        </div>
        <button
          type="button"
          onClick={refreshConversations}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-gray-300 hover:text-white hover:bg-white/15 transition-colors text-sm w-full sm:w-auto justify-center"
        >
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
          <Search size={16} className="text-gray-500 shrink-0" />
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Buscar conversaciones..."
            className="bg-transparent text-sm text-white placeholder-gray-600 outline-none w-full"
          />
        </div>
        <div className="flex gap-1 rounded-xl bg-white/5 p-1">
          {(["all", "open", "assigned", "closed"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === s ? "bg-white/10 text-white" : "text-gray-500 hover:text-white"
              }`}
            >
              {s === "all" ? "Todas" : statusLabel(s)}
            </button>
          ))}
        </div>
      </div>

      {filteredConvs.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Headset size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No hay conversaciones de soporte</p>
          <p className="text-xs mt-1">Las conversaciones aparecerán aquí cuando los visitantes soliciten ayuda</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredConvs.map((conv) => (
            <button
              key={conv.id}
              type="button"
              onClick={() => openConversation(conv)}
              className="w-full text-left rounded-2xl border border-white/10 bg-white/[0.02] p-4 hover:border-white/20 hover:bg-white/[0.04] transition-colors flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center shrink-0">
                <User size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm text-white font-semibold truncate">{conv.visitor_name}</p>
                  <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border shrink-0" style={{
                    borderColor: conv.status === "open" ? "rgba(251,191,36,0.2)" : conv.status === "assigned" ? "rgba(34,211,238,0.2)" : "rgba(16,185,129,0.2)",
                    background: conv.status === "open" ? "rgba(251,191,36,0.1)" : conv.status === "assigned" ? "rgba(34,211,238,0.1)" : "rgba(16,185,129,0.1)",
                    color: conv.status === "open" ? "#fbbf24" : conv.status === "assigned" ? "#22d3ee" : "#10b981",
                  }}>
                    {statusIcon(conv.status)} {statusLabel(conv.status)}
                  </span>
                  {conv.escalated_from_ai && (
                    <span className="text-[10px] text-amber-300"><Bot size={10} className="inline" /></span>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate">
                  ID: {conv.visitor_id.slice(0, 20)}... · {fmtTime(conv.updated_at)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
