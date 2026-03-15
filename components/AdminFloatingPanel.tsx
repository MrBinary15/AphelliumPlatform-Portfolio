"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { publishNoticia, publishProyecto } from "@/app/actions/panel";
import {
  Mail, X, Minimize2, Maximize2, Clock, CheckCircle,
  Edit3, Save, ChevronLeft, Inbox, Newspaper, FolderOpen,
  Loader2, Check,
} from "lucide-react";

type Mensaje = {
  id: string; status: string; name: string; company: string;
  email: string; topic: string; message: string; created_at: string;
};

type Tab = "mensajes" | "noticia" | "proyecto";

/* ─── Small reusable input ─── */
function Field({ label, name, placeholder, textarea, required, type = "text", accept }: {
  label: string; name: string; placeholder?: string;
  textarea?: boolean; required?: boolean; type?: string; accept?: string;
}) {
  const cls = type === "file"
    ? "w-full bg-black/50 border border-white/10 rounded-xl file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[var(--accent-cyan)]/10 file:text-[var(--accent-cyan)] hover:file:bg-[var(--accent-cyan)]/20 text-gray-400 focus:outline-none transition-colors cursor-pointer text-xs"
    : "w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-[var(--accent-cyan)] transition-colors resize-none";
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-gray-400">
        {label}{required && <span className="text-[var(--accent-cyan)]"> *</span>}
      </label>
      {textarea
        ? <textarea name={name} rows={3} placeholder={placeholder} required={required} className={cls} />
        : <input type={type} name={name} placeholder={placeholder} required={required} accept={accept} className={cls} />}
    </div>
  );
}

export default function AdminFloatingPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("mensajes");

  // Messages state
  const [messages, setMessages] = useState<Mensaje[]>([]);
  const [selected, setSelected] = useState<Mensaje | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Edit mode
  const [isEditMode, setIsEditMode] = useState(false);

  // Publish forms state
  const [noticiaStatus, setNoticiaStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [noticiaError, setNoticiaError] = useState("");
  const [proyectoStatus, setProyectoStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [proyectoError, setProyectoError] = useState("");

  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setLoading(false);
      if (session) fetchMessages();
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      if (session) fetchMessages();
      else { setMessages([]); setIsOpen(false); }
    });
    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase.from("mensajes").select("*").order("created_at", { ascending: false });
    if (data) {
      setMessages(data);
      setUnreadCount(data.filter((m: Mensaje) => m.status === "unread").length);
    }
  }, [supabase]);

  const markAsRead = async (msg: Mensaje) => {
    setSelected(msg);
    if (msg.status === "unread") {
      await supabase.from("mensajes").update({ status: "read" }).eq("id", msg.id);
      setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, status: "read" } : m));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const toggleEditMode = () => {
    const newMode = !isEditMode;
    setIsEditMode(newMode);
    document.querySelectorAll("h1, h2, h3, h4, p").forEach((el) => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.closest("#admin-floating-panel")) return;
      htmlEl.contentEditable = newMode ? "true" : "false";
      htmlEl.classList.toggle("outline", newMode);
      htmlEl.classList.toggle("outline-1", newMode);
      htmlEl.classList.toggle("outline-offset-2", newMode);
      htmlEl.classList.toggle("rounded", newMode);
      htmlEl.classList.toggle("cursor-text", newMode);
      if (newMode) htmlEl.style.outlineColor = "var(--accent-cyan)";
    });
  };

  const handlePublishNoticia = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNoticiaStatus("loading"); setNoticiaError("");
    const fd = new FormData(e.currentTarget);
    const result = await publishNoticia(fd);
    if (result?.error) { setNoticiaStatus("error"); setNoticiaError(result.error); }
    else { setNoticiaStatus("success"); (e.target as HTMLFormElement).reset(); }
    setTimeout(() => setNoticiaStatus("idle"), 3000);
  };

  const handlePublishProyecto = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProyectoStatus("loading"); setProyectoError("");
    const fd = new FormData(e.currentTarget);
    const result = await publishProyecto(fd);
    if (result?.error) { setProyectoStatus("error"); setProyectoError(result.error); }
    else { setProyectoStatus("success"); (e.target as HTMLFormElement).reset(); }
    setTimeout(() => setProyectoStatus("idle"), 3000);
  };

  if (loading || !isAuthenticated) return null;

  /* ── Minimized Tab ── */
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-[var(--bg-darker)] border border-white/10 shadow-2xl hover:border-[var(--accent-cyan)]/50 transition-all duration-200 group"
      >
        <div className="relative">
          <Mail size={20} className="text-[var(--accent-cyan)]" />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-[var(--accent-cyan)] text-black text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
        <span className="text-sm font-medium text-white group-hover:text-[var(--accent-cyan)] transition-colors">Admin</span>
        <Maximize2 size={14} className="text-gray-500" />
      </button>
    );
  }

  /* ── Full Panel ── */
  const panelWidth = isMinimized ? "w-80 h-12" : activeTab === "mensajes" ? "w-[720px] max-w-[95vw] h-[540px] max-h-[82vh]" : "w-[480px] max-w-[95vw] h-[560px] max-h-[82vh]";

  return (
    <div
      id="admin-floating-panel"
      className={`fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl shadow-2xl border border-white/10 overflow-hidden transition-all duration-300 ${panelWidth}`}
      style={{ background: "rgba(2, 4, 10, 0.96)", backdropFilter: "blur(24px)" }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-black/60 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--accent-cyan)] animate-pulse" />
          <span className="text-sm font-semibold text-white">Panel Admin</span>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] rounded-full border border-[var(--accent-cyan)]/30">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleEditMode}
            title="Editar texto de la página"
            className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs ${isEditMode ? "bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]" : "text-gray-400 hover:text-white hover:bg-white/10"}`}
          >
            <Edit3 size={13} />
            <span className="hidden sm:inline">{isEditMode ? "Editando" : "Editar"}</span>
          </button>
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
            <Minimize2 size={13} />
          </button>
          <button onClick={() => { setIsOpen(false); setSelected(null); }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <X size={13} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* ── Tab Bar ── */}
          <div className="flex border-b border-white/10 shrink-0 bg-black/30">
            {([
              { id: "mensajes", label: "Mensajes", icon: <Inbox size={13} />, badge: unreadCount },
              { id: "noticia", label: "Noticia", icon: <Newspaper size={13} /> },
              { id: "proyecto", label: "Proyecto", icon: <FolderOpen size={13} /> },
            ] as { id: Tab; label: string; icon: React.ReactNode; badge?: number }[]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors relative ${
                  activeTab === tab.id
                    ? "border-[var(--accent-cyan)] text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/5"
                    : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5"
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.badge && tab.badge > 0 ? (
                  <span className="bg-[var(--accent-cyan)] text-black text-[9px] font-bold rounded-full px-1.5 py-0.5 min-w-[16px] text-center leading-none">
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {/* ── Tab Content ── */}
          <div className="flex-1 overflow-hidden">

            {/* MENSAJES TAB */}
            {activeTab === "mensajes" && (
              <div className="flex h-full overflow-hidden">
                {/* List */}
                <div className={`flex flex-col border-r border-white/10 overflow-y-auto shrink-0 ${selected ? "w-52" : "w-full"}`}>
                  {messages.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-gray-600 text-sm p-6 text-center">No hay mensajes</div>
                  ) : (
                    messages.map((msg) => (
                      <button key={msg.id} onClick={() => markAsRead(msg)}
                        className={`w-full text-left px-3 py-3 border-b border-white/5 hover:bg-white/5 transition-colors ${selected?.id === msg.id ? "bg-[var(--accent-cyan)]/10 border-l-2 border-l-[var(--accent-cyan)]" : ""} ${msg.status === "unread" ? "bg-white/[0.03]" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className={`text-xs font-medium truncate ${msg.status === "unread" ? "text-white" : "text-gray-400"}`}>{msg.name}</span>
                          {msg.status === "unread" ? <Clock size={10} className="text-[var(--accent-cyan)] shrink-0 mt-0.5" /> : <CheckCircle size={10} className="text-gray-600 shrink-0 mt-0.5" />}
                        </div>
                        <p className="text-[11px] text-gray-500 truncate">{msg.topic || "Consulta"} · {msg.company || msg.email}</p>
                        <p className="text-[11px] text-gray-600 truncate mt-0.5">{msg.message}</p>
                        <p className="text-[10px] text-gray-700 mt-1">{new Date(msg.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}</p>
                      </button>
                    ))
                  )}
                </div>

                {/* Detail */}
                {selected && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/10 bg-white/[0.02] shrink-0">
                      <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-white mb-2 transition-colors">
                        <ChevronLeft size={12} /> Volver
                      </button>
                      <h3 className="font-semibold text-white text-sm truncate">{selected.name}</h3>
                      <p className="text-xs text-gray-500">{selected.email}</p>
                      {selected.company && <p className="text-xs text-gray-600">{selected.company}</p>}
                    </div>
                    <div className="px-4 py-2 border-b border-white/5 shrink-0 flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/20">{selected.topic || "Consulta General"}</span>
                      <span className="text-[10px] text-gray-600">{new Date(selected.created_at).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                      <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{selected.message}</p>
                    </div>
                    <div className="px-4 py-3 border-t border-white/10 shrink-0">
                      <a href={`mailto:${selected.email}?subject=Re: ${selected.topic || "Consulta"} — Aphellium`}
                        className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)] text-xs font-medium hover:bg-[var(--accent-cyan)]/20 transition-colors">
                        <Mail size={13} /> Responder por correo
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* NOTICIA TAB */}
            {activeTab === "noticia" && (
              <div className="h-full overflow-y-auto p-4">
                <p className="text-xs text-gray-500 mb-4">Publica una noticia en el blog público de Aphellium.</p>
                <form onSubmit={handlePublishNoticia} className="space-y-3">
                  <Field label="Título" name="title" placeholder="Nuevos avances en refrigeración..." required />
                  <Field label="Categoría" name="category" placeholder="Tecnología, General, Sostenibilidad" />
                  <Field label="Resumen" name="excerpt" placeholder="Breve descripción para el listado..." textarea />
                  <Field label="Contenido completo" name="content" placeholder="Texto completo de la noticia..." textarea required />
                  <Field label="Imagen Principal" name="image" type="file" accept="image/*" />

                  {noticiaStatus === "error" && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{noticiaError}</p>}
                  {noticiaStatus === "success" && <p className="text-xs text-green-400 bg-green-500/10 rounded-lg px-3 py-2 flex items-center gap-1"><Check size={12} /> ¡Noticia publicada!</p>}

                  <button type="submit" disabled={noticiaStatus === "loading"}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--accent-cyan)] text-black text-xs font-bold hover:bg-cyan-300 transition-colors disabled:opacity-50">
                    {noticiaStatus === "loading" ? <><Loader2 size={13} className="animate-spin" /> Publicando...</> : <><Newspaper size={13} /> Publicar Noticia</>}
                  </button>
                </form>
              </div>
            )}

            {/* PROYECTO TAB */}
            {activeTab === "proyecto" && (
              <div className="h-full overflow-y-auto p-4">
                <p className="text-xs text-gray-500 mb-4">Publica un nuevo proyecto en el portafolio de Aphellium.</p>
                <form onSubmit={handlePublishProyecto} className="space-y-3">
                  <Field label="Nombre del Proyecto" name="title" placeholder="Sistema de Telemetría APHE v2..." required />
                  <Field label="Categoría" name="category" placeholder="Infraestructura, IoT, Software" />
                  <Field label="Resumen" name="excerpt" placeholder="Descripción corta para el listado..." textarea />
                  <Field label="Descripción completa" name="description" placeholder="Descripción detallada del proyecto..." textarea />
                  <Field label="URL de imagen" name="img_url" placeholder="https://..." type="url" />

                  {proyectoStatus === "error" && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{proyectoError}</p>}
                  {proyectoStatus === "success" && <p className="text-xs text-green-400 bg-green-500/10 rounded-lg px-3 py-2 flex items-center gap-1"><Check size={12} /> ¡Proyecto publicado!</p>}

                  <button type="submit" disabled={proyectoStatus === "loading"}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--accent-green)] text-black text-xs font-bold hover:bg-emerald-300 transition-colors disabled:opacity-50">
                    {proyectoStatus === "loading" ? <><Loader2 size={13} className="animate-spin" /> Publicando...</> : <><FolderOpen size={13} /> Publicar Proyecto</>}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Edit mode bar */}
          {isEditMode && (
            <div className="px-4 py-2 border-t border-[var(--accent-cyan)]/30 bg-[var(--accent-cyan)]/5 flex items-center justify-between shrink-0">
              <span className="text-xs text-[var(--accent-cyan)]">✏️ Haz clic en cualquier texto para editarlo</span>
              <button onClick={toggleEditMode} className="flex items-center gap-1.5 px-3 py-1 bg-[var(--accent-cyan)] text-black text-xs font-bold rounded-lg hover:bg-cyan-300 transition-colors">
                <Save size={11} /> Finalizar
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
