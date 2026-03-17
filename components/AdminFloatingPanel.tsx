"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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

const ADMIN_PANEL_W = 720;
const ADMIN_PANEL_H = 540;
const ADMIN_PANEL_MIN_W = 300;
const ADMIN_PANEL_MIN_H = 280;
const ADMIN_LAUNCHER_W = 138;
const ADMIN_LAUNCHER_H = 54;
const ADMIN_SAFE_MARGIN = 12;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

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
  const [isAdmin, setIsAdmin] = useState(false);
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
  const [panelSize, setPanelSize] = useState({ width: ADMIN_PANEL_W, height: ADMIN_PANEL_H });
  const [launcherPosition, setLauncherPosition] = useState({ x: 24, y: 24 });
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  const panelSizeRef = useRef(panelSize);
  const launcherPositionRef = useRef(launcherPosition);
  const launcherDragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const resizingRef = useRef<{
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const panelSizeStorageKey = "aphellium-admin-panel-size";
  const launcherStorageKey = "aphellium-admin-launcher-pos";

  const getPanelMax = useCallback(() => {
    if (typeof window === "undefined") {
      return { maxW: ADMIN_PANEL_W, maxH: ADMIN_PANEL_H };
    }
    return {
      maxW: Math.max(ADMIN_PANEL_MIN_W, window.innerWidth - 24),
      maxH: Math.max(ADMIN_PANEL_MIN_H, window.innerHeight - 24),
    };
  }, []);

  const clampPanelSize = useCallback((width: number, height: number) => {
    const { maxW, maxH } = getPanelMax();
    return {
      width: clamp(width, ADMIN_PANEL_MIN_W, maxW),
      height: clamp(height, ADMIN_PANEL_MIN_H, maxH),
    };
  }, [getPanelMax]);

  const clampLauncherPosition = useCallback((x: number, y: number) => {
    if (typeof window === "undefined") return { x, y };
    return {
      x: clamp(x, ADMIN_SAFE_MARGIN, Math.max(ADMIN_SAFE_MARGIN, window.innerWidth - ADMIN_LAUNCHER_W - ADMIN_SAFE_MARGIN)),
      y: clamp(y, ADMIN_SAFE_MARGIN, Math.max(ADMIN_SAFE_MARGIN, window.innerHeight - ADMIN_LAUNCHER_H - ADMIN_SAFE_MARGIN)),
    };
  }, []);

  const persistPanelSize = useCallback((width: number, height: number) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(panelSizeStorageKey, JSON.stringify({ width, height }));
    } catch {
      // Ignore storage write failures.
    }
  }, []);

  const persistLauncherPosition = useCallback((x: number, y: number) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(launcherStorageKey, JSON.stringify({ x, y }));
    } catch {
      // Ignore storage write failures.
    }
  }, []);

  const panelAnchor = useMemo(() => {
    if (typeof window === "undefined") {
      return { x: launcherPosition.x, y: launcherPosition.y + ADMIN_LAUNCHER_H + 8 };
    }

    const gap = 8;
    const placeAbove = launcherPosition.y + ADMIN_LAUNCHER_H + gap + panelSize.height > window.innerHeight - ADMIN_SAFE_MARGIN;
    const preferredY = placeAbove
      ? launcherPosition.y - panelSize.height - gap
      : launcherPosition.y + ADMIN_LAUNCHER_H + gap;
    const preferredX = launcherPosition.x + ADMIN_LAUNCHER_W - panelSize.width;

    return {
      x: clamp(preferredX, ADMIN_SAFE_MARGIN, Math.max(ADMIN_SAFE_MARGIN, window.innerWidth - panelSize.width - ADMIN_SAFE_MARGIN)),
      y: clamp(preferredY, ADMIN_SAFE_MARGIN, Math.max(ADMIN_SAFE_MARGIN, window.innerHeight - panelSize.height - ADMIN_SAFE_MARGIN)),
    };
  }, [launcherPosition, panelSize.height, panelSize.width]);

  const supabase = createClient();

  useEffect(() => {
    const resolveAdminAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setIsAdmin(false);
        setMessages([]);
        setIsOpen(false);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      const canUsePanel = profile?.role === "admin";
      setIsAdmin(canUsePanel);
      setLoading(false);

      if (canUsePanel) fetchMessages();
      else {
        setMessages([]);
        setIsOpen(false);
      }
    };

    resolveAdminAccess();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      resolveAdminAccess();
    });

    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    panelSizeRef.current = panelSize;
  }, [panelSize]);

  useEffect(() => {
    launcherPositionRef.current = launcherPosition;
  }, [launcherPosition]);

  useEffect(() => {
    const syncViewport = () => {
      if (typeof window === "undefined") return;
      setIsMobileViewport(window.innerWidth < 768);
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(panelSizeStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { width?: number; height?: number };
        if (typeof parsed?.width === "number" && typeof parsed?.height === "number") {
          setPanelSize(clampPanelSize(parsed.width, parsed.height));
        }
      }
    } catch {
      // Ignore invalid storage payload.
    }

    const fallback = clampLauncherPosition(window.innerWidth - ADMIN_LAUNCHER_W - 24, window.innerHeight - ADMIN_LAUNCHER_H - 24);
    try {
      const raw = window.localStorage.getItem(launcherStorageKey);
      if (!raw) {
        setLauncherPosition(fallback);
        return;
      }

      const parsed = JSON.parse(raw) as { x?: number; y?: number };
      if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
        setLauncherPosition(clampLauncherPosition(parsed.x, parsed.y));
      } else {
        setLauncherPosition(fallback);
      }
    } catch {
      setLauncherPosition(fallback);
    }
  }, [clampLauncherPosition, clampPanelSize]);

  useEffect(() => {
    const onResize = () => {
      setPanelSize((prev) => {
        const next = clampPanelSize(prev.width, prev.height);
        persistPanelSize(next.width, next.height);
        return next;
      });
      setLauncherPosition((prev) => {
        const next = clampLauncherPosition(prev.x, prev.y);
        persistLauncherPosition(next.x, next.y);
        return next;
      });
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampPanelSize, persistPanelSize, clampLauncherPosition, persistLauncherPosition]);

  const startLauncherDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    launcherDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: launcherPosition.x,
      originY: launcherPosition.y,
      moved: false,
    };

    const onMove = (ev: PointerEvent) => {
      if (!launcherDragRef.current) return;
      const dx = ev.clientX - launcherDragRef.current.startX;
      const dy = ev.clientY - launcherDragRef.current.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) launcherDragRef.current.moved = true;
      setLauncherPosition(clampLauncherPosition(launcherDragRef.current.originX + dx, launcherDragRef.current.originY + dy));
    };

    const onUp = () => {
      if (!launcherDragRef.current) return;
      if (!launcherDragRef.current.moved) {
        setIsOpen((prev) => !prev);
      }
      persistLauncherPosition(launcherPositionRef.current.x, launcherPositionRef.current.y);
      launcherDragRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  const startResize = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    resizingRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: panelSize.width,
      startH: panelSize.height,
    };

    const onMove = (ev: PointerEvent) => {
      if (!resizingRef.current) return;
      const dx = ev.clientX - resizingRef.current.startX;
      const dy = ev.clientY - resizingRef.current.startY;
      setPanelSize(clampPanelSize(resizingRef.current.startW + dx, resizingRef.current.startH + dy));
    };

    const onUp = () => {
      if (resizingRef.current) {
        const finalSize = clampPanelSize(panelSizeRef.current.width, panelSizeRef.current.height);
        persistPanelSize(finalSize.width, finalSize.height);
      }
      resizingRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

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

  if (loading || !isAdmin) return null;

  /* ── Minimized Tab ── */
  if (!isOpen) {
    return (
      <button
        onPointerDown={startLauncherDrag}
        className="fixed z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-[var(--bg-darker)] border border-white/10 shadow-2xl hover:border-[var(--accent-cyan)]/50 transition-all duration-200 group select-none"
        style={{
          left: launcherPosition.x,
          top: launcherPosition.y,
          width: ADMIN_LAUNCHER_W,
          height: ADMIN_LAUNCHER_H,
          touchAction: "none",
        }}
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
  const currentWidth = isMinimized ? 320 : panelSize.width;
  const currentHeight = isMinimized ? 48 : panelSize.height;

  return (
    <div
      id="admin-floating-panel"
      className="fixed z-50 flex flex-col rounded-2xl shadow-2xl border border-white/10 overflow-hidden transition-all duration-300"
      style={{
        width: currentWidth,
        height: currentHeight,
        left: panelAnchor.x,
        top: panelAnchor.y,
        maxWidth: "calc(100vw - 24px)",
        maxHeight: "calc(100dvh - 24px)",
        background: "rgba(2, 4, 10, 0.96)",
        backdropFilter: "blur(24px)",
      }}
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

          <div
            onPointerDown={startResize}
            className={`absolute right-1 bottom-1 ${isMobileViewport ? "h-6 w-6" : "h-4 w-4"} cursor-nwse-resize rounded-sm opacity-60 hover:opacity-100`}
            title="Cambiar tamaño"
            style={{
              touchAction: "none",
              background:
                "linear-gradient(135deg, transparent 0%, transparent 45%, rgba(255,255,255,0.35) 45%, rgba(255,255,255,0.35) 55%, transparent 55%, transparent 100%)",
            }}
          />
        </>
      )}
    </div>
  );
}
