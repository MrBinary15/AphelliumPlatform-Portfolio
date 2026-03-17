"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  MessageCircle,
  X,
  Search,
  Send,
  ArrowLeft,
  Paperclip,
  Smile,
  FileText,
  Download,
  Check,
  Pencil,
  Trash2,
  MoreVertical,
  Users,
  Plus,
  Bot,
  Headset,
  Loader2,
  ArrowRightCircle,
} from "lucide-react";

type Member = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
};

type ChatMsg = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

type ChatFilePayload = {
  name: string;
  url: string;
  mimeType: string;
  size: number;
  storagePath?: string;
};

type LightboxState = {
  url: string;
  name: string;
  kind: "image" | "video";
};

type ToastData = {
  senderId: string;
  senderName: string;
  content: string;
};

type ChatRoom = {
  id: string;
  name: string;
  room_type: "manual" | "task";
  task_id: string | null;
};

type ChatRoomMessage = {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

const FILE_MSG_PREFIX = "__file__|";
const QUICK_EMOJIS = ["😀", "😂", "😍", "😎", "🤝", "👏", "🔥", "💡", "✅", "🙌", "❤️", "🚀"] as const;
const PANEL_W = 360;
const PANEL_H = 560;
const PANEL_MIN_W = 320;
const PANEL_MIN_H = 460;
const PANEL_MOBILE_MIN_W = 260;
const PANEL_MOBILE_MIN_H = 320;
const LAUNCHER_W = 176;
const LAUNCHER_H = 52;
const LAUNCHER_MOBILE_SIZE = 58;
const SAFE_MARGIN = 12;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const initials = (n: string | null) => (n || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

const fmtTime = (ts: string) => {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "ahora";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("es", { day: "2-digit", month: "short" });
};

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / (1024 ** idx);
  return `${val >= 100 ? val.toFixed(0) : val.toFixed(1)} ${units[idx]}`;
};

const serializeFileMessage = (payload: ChatFilePayload) => `${FILE_MSG_PREFIX}${JSON.stringify(payload)}`;

const parseFileMessage = (content: string): ChatFilePayload | null => {
  if (!content.startsWith(FILE_MSG_PREFIX)) return null;
  try {
    const parsed = JSON.parse(content.slice(FILE_MSG_PREFIX.length)) as ChatFilePayload;
    if (!parsed?.name || !parsed?.url) return null;
    return parsed;
  } catch {
    return null;
  }
};

const getAttachmentKind = (payload: ChatFilePayload | null): "image" | "video" | "file" => {
  if (!payload) return "file";
  const type = (payload.mimeType || "").toLowerCase();
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  return "file";
};

const previewText = (msg: ChatMsg | undefined, userId: string) => {
  if (!msg) return "Sin mensajes";
  const file = parseFileMessage(msg.content);
  const base = file ? (getAttachmentKind(file) === "image" ? `Imagen: ${file.name}` : getAttachmentKind(file) === "video" ? `Video: ${file.name}` : `Archivo: ${file.name}`) : msg.content;
  return msg.sender_id === userId ? `Tu: ${base}` : base;
};

export default function ChatWidget({ userId, userName, userRole }: { userId: string | null; userName: string; userRole: string | null }) {
  const supabase = createClient();
  const isAuthenticated = !!userId;
  const canManageGroups = userRole === "admin" || userRole === "coordinador";
  const userIdSafe: string = userId ?? "";
  const storageIdentity = userId || "guest";

  // ── Visitor chat state ──
  type VisitorMode = "menu" | "ai" | "support";
  type VisitorMsg = { id: string; role: "user" | "assistant" | "system"; content: string; timestamp: string };
  const [visitorMode, setVisitorMode] = useState<VisitorMode>("menu");
  const [visitorAiMessages, setVisitorAiMessages] = useState<VisitorMsg[]>([]);
  const [visitorSupportMessages, setVisitorSupportMessages] = useState<VisitorMsg[]>([]);
  const [visitorDraft, setVisitorDraft] = useState("");
  const [visitorAiLoading, setVisitorAiLoading] = useState(false);
  const [visitorSupportConvId, setVisitorSupportConvId] = useState<string | null>(null);
  const [visitorSupportStatus, setVisitorSupportStatus] = useState<string>("open");
  const visitorSupportPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const visitorMessagesEndRef = useRef<HTMLDivElement>(null);

  const getVisitorId = useCallback(() => {
    if (typeof window === "undefined") return "visitor-unknown";
    let vid = window.localStorage.getItem("aphellium-visitor-id");
    if (!vid) {
      vid = `visitor-${crypto.randomUUID()}`;
      window.localStorage.setItem("aphellium-visitor-id", vid);
    }
    return vid;
  }, []);

  const getSupportIdentity = useCallback(() => {
    if (isAuthenticated) {
      return {
        id: userIdSafe,
        name: userName || "Usuario",
      };
    }
    return {
      id: getVisitorId(),
      name: "Visitante",
    };
  }, [isAuthenticated, userIdSafe, userName, getVisitorId]);

  // ── Authenticated chat state ──
  // ── Authenticated chat state ──
  const [isOpen, setIsOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [messagesByUser, setMessagesByUser] = useState<Record<string, ChatMsg[]>>({});
  const [draftByUser, setDraftByUser] = useState<Record<string, string>>({});
  const [uploadingByUser, setUploadingByUser] = useState<Record<string, boolean>>({});
  const [chatMode, setChatMode] = useState<"direct" | "group" | "ai" | "support">("direct");
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [roomMessagesById, setRoomMessagesById] = useState<Record<string, ChatRoomMessage[]>>({});
  const [roomDraftById, setRoomDraftById] = useState<Record<string, string>>({});
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomMemberIds, setNewRoomMemberIds] = useState<string[]>([]);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [messageMenuId, setMessageMenuId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [panelSize, setPanelSize] = useState({ width: PANEL_W, height: PANEL_H });
  const [launcherPosition, setLauncherPosition] = useState({ x: 24, y: 24 });
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const activeMember = useMemo(() => members.find((m) => m.id === activeChatId) || null, [members, activeChatId]);
  const activeMessages = useMemo(() => (activeChatId ? messagesByUser[activeChatId] || [] : []), [messagesByUser, activeChatId]);
  const activeRoom = useMemo(() => rooms.find((r) => r.id === activeRoomId) || null, [rooms, activeRoomId]);
  const activeRoomMessages = useMemo(() => (activeRoomId ? roomMessagesById[activeRoomId] || [] : []), [roomMessagesById, activeRoomId]);
  const totalUnread = useMemo(() => Object.values(unreadMap).reduce((a, b) => a + b, 0), [unreadMap]);
  const onlineCount = useMemo(() => members.filter((m) => onlineIds.has(m.id)).length, [members, onlineIds]);
  const panelSizeStorageKey = `aphellium-chat-panel-size:${storageIdentity}`;
  const launcherStorageKey = `aphellium-chat-launcher-pos:${storageIdentity}`;

  useEffect(() => {
    panelSizeRef.current = panelSize;
  }, [panelSize]);

  useEffect(() => {
    launcherPositionRef.current = launcherPosition;
  }, [launcherPosition]);

  const getPanelMax = useCallback(() => {
    if (typeof window === "undefined") {
      return { maxW: PANEL_W, maxH: PANEL_H };
    }
    const minW = isMobileViewport ? PANEL_MOBILE_MIN_W : PANEL_MIN_W;
    const minH = isMobileViewport ? PANEL_MOBILE_MIN_H : PANEL_MIN_H;
    return {
      maxW: Math.max(minW, window.innerWidth - 24),
      maxH: Math.max(minH, window.innerHeight - 24),
    };
  }, [isMobileViewport]);

  const clampLauncherPosition = useCallback((x: number, y: number) => {
    if (typeof window === "undefined") return { x, y };
    const launcherW = isMobileViewport ? LAUNCHER_MOBILE_SIZE : LAUNCHER_W;
    const launcherH = isMobileViewport ? LAUNCHER_MOBILE_SIZE : LAUNCHER_H;
    return {
      x: clamp(x, SAFE_MARGIN, Math.max(SAFE_MARGIN, window.innerWidth - launcherW - SAFE_MARGIN)),
      y: clamp(y, SAFE_MARGIN, Math.max(SAFE_MARGIN, window.innerHeight - launcherH - SAFE_MARGIN)),
    };
  }, [isMobileViewport]);

  const clampPanelSize = useCallback((width: number, height: number) => {
    const minW = isMobileViewport ? PANEL_MOBILE_MIN_W : PANEL_MIN_W;
    const minH = isMobileViewport ? PANEL_MOBILE_MIN_H : PANEL_MIN_H;
    const { maxW, maxH } = getPanelMax();
    return {
      width: clamp(width, minW, maxW),
      height: clamp(height, minH, maxH),
    };
  }, [getPanelMax, isMobileViewport]);

  const persistPanelSize = useCallback((width: number, height: number) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(panelSizeStorageKey, JSON.stringify({ width, height }));
    } catch {
      // Ignore storage write failures.
    }
  }, [panelSizeStorageKey]);

  const persistLauncherPosition = useCallback((x: number, y: number) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(launcherStorageKey, JSON.stringify({ x, y }));
    } catch {
      // Ignore storage write failures.
    }
  }, [launcherStorageKey]);

  const showToast = useCallback((data: ToastData) => {
    setToast(data);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2800);
  }, []);

  // ── Visitor chat functions ──
  const sendVisitorAiMessage = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content || visitorAiLoading) return;

    const userMsg: VisitorMsg = { id: crypto.randomUUID(), role: "user", content, timestamp: new Date().toISOString() };
    setVisitorAiMessages((prev) => [...prev, userMsg]);
    setVisitorDraft("");
    setVisitorAiLoading(true);

    try {
      const history = visitorAiMessages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
      const res = await fetch("/api/chat/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, messages: history }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");

      const aiMsg: VisitorMsg = { id: crypto.randomUUID(), role: "assistant", content: data.reply, timestamp: new Date().toISOString() };
      setVisitorAiMessages((prev) => [...prev, aiMsg]);

      if (data.escalate) {
        const escalateMsg: VisitorMsg = {
          id: crypto.randomUUID(),
          role: "system",
          content: "¿Te gustaría hablar con un asesor humano? Puedo transferirte a soporte técnico.",
          timestamp: new Date().toISOString(),
        };
        setVisitorAiMessages((prev) => [...prev, escalateMsg]);
      }
    } catch {
      const errMsg: VisitorMsg = { id: crypto.randomUUID(), role: "assistant", content: "Lo siento, hubo un error al procesar tu mensaje. Intenta de nuevo.", timestamp: new Date().toISOString() };
      setVisitorAiMessages((prev) => [...prev, errMsg]);
    } finally {
      setVisitorAiLoading(false);
    }
  }, [visitorAiMessages, visitorAiLoading]);

  const startSupportConversation = useCallback(async (escalatedFromAi = false) => {
    const actor = getSupportIdentity();
    try {
      const res = await fetch("/api/chat/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", visitorId: actor.id, visitorName: actor.name, escalatedFromAi }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setVisitorSupportConvId(data.conversationId);
      if (!isAuthenticated) setVisitorMode("support");

      // Load initial messages
      const msgRes = await fetch(`/api/chat/support?conversationId=${data.conversationId}&visitorId=${actor.id}`);
      const msgData = await msgRes.json();
      if (msgData.messages) {
        setVisitorSupportMessages(msgData.messages.map((m: { id: string; sender_type: string; content: string; created_at: string }) => ({
          id: m.id,
          role: m.sender_type === "visitor" ? "user" as const : m.sender_type === "system" ? "system" as const : "assistant" as const,
          content: m.content,
          timestamp: m.created_at,
        })));
      }
    } catch {
      alert("No se pudo iniciar la conversación de soporte.");
    }
  }, [getSupportIdentity, isAuthenticated]);

  const sendVisitorSupportMessage = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content || !visitorSupportConvId) return;

    const actor = getSupportIdentity();
    const userMsg: VisitorMsg = { id: crypto.randomUUID(), role: "user", content, timestamp: new Date().toISOString() };
    setVisitorSupportMessages((prev) => [...prev, userMsg]);
    setVisitorDraft("");

    try {
      await fetch("/api/chat/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", conversationId: visitorSupportConvId, visitorId: actor.id, content }),
      });
    } catch {
      // Message was already optimistically added
    }
  }, [visitorSupportConvId, getSupportIdentity]);

  // Poll for support messages
  useEffect(() => {
    const supportActive = (!isAuthenticated && visitorMode === "support") || (isAuthenticated && chatMode === "support");
    if (!supportActive || !visitorSupportConvId || !isOpen) {
      if (visitorSupportPollRef.current) {
        clearInterval(visitorSupportPollRef.current);
        visitorSupportPollRef.current = null;
      }
      return;
    }

    const actor = getSupportIdentity();
    let lastTimestamp = visitorSupportMessages.length > 0
      ? visitorSupportMessages[visitorSupportMessages.length - 1].timestamp
      : "";

    const poll = async () => {
      try {
        const params = new URLSearchParams({
          conversationId: visitorSupportConvId,
          visitorId: actor.id,
          ...(lastTimestamp ? { after: lastTimestamp } : {}),
        });
        const res = await fetch(`/api/chat/support?${params}`);
        const data = await res.json();

        if (data.status) setVisitorSupportStatus(data.status);

        if (data.messages?.length > 0) {
          const newMsgs: VisitorMsg[] = data.messages
            .filter((m: { sender_type: string; sender_id?: string }) => !(m.sender_type === "visitor" && m.sender_id === actor.id))
            .map((m: { id: string; sender_type: string; content: string; created_at: string }) => ({
              id: m.id,
              role: m.sender_type === "visitor" ? "user" as const : m.sender_type === "system" ? "system" as const : "assistant" as const,
              content: m.content,
              timestamp: m.created_at,
            }));

          if (newMsgs.length > 0) {
            setVisitorSupportMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const unique = newMsgs.filter((m: VisitorMsg) => !existingIds.has(m.id));
              return unique.length > 0 ? [...prev, ...unique] : prev;
            });
            lastTimestamp = data.messages[data.messages.length - 1].created_at;
          }
        }
      } catch {
        // Ignore poll errors
      }
    };

    poll();
    visitorSupportPollRef.current = setInterval(poll, 3000);

    return () => {
      if (visitorSupportPollRef.current) {
        clearInterval(visitorSupportPollRef.current);
        visitorSupportPollRef.current = null;
      }
    };
  }, [isAuthenticated, visitorMode, visitorSupportConvId, isOpen, visitorSupportMessages, chatMode, getSupportIdentity]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (chatMode !== "support") return;
    if (visitorSupportConvId) return;
    startSupportConversation(false);
  }, [isAuthenticated, chatMode, visitorSupportConvId, startSupportConversation]);

  // Scroll visitor messages
  useEffect(() => {
    visitorMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visitorAiMessages.length, visitorSupportMessages.length]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(panelSizeStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { width?: number; height?: number };
      if (typeof parsed?.width !== "number" || typeof parsed?.height !== "number") return;

      const next = clampPanelSize(parsed.width, parsed.height);
      setPanelSize(next);
    } catch {
      // Ignore invalid storage payload.
    }
  }, [clampPanelSize, panelSizeStorageKey]);

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
    const launcherW = isMobileViewport ? LAUNCHER_MOBILE_SIZE : LAUNCHER_W;
    const launcherH = isMobileViewport ? LAUNCHER_MOBILE_SIZE : LAUNCHER_H;
    const fallback = clampLauncherPosition(window.innerWidth - launcherW - 24, window.innerHeight - launcherH - 24);

    try {
      const raw = window.localStorage.getItem(launcherStorageKey);
      if (!raw) {
        setLauncherPosition(fallback);
        return;
      }
      const parsed = JSON.parse(raw) as { x?: number; y?: number };
      if (typeof parsed?.x !== "number" || typeof parsed?.y !== "number") {
        setLauncherPosition(fallback);
        return;
      }
      setLauncherPosition(clampLauncherPosition(parsed.x, parsed.y));
    } catch {
      setLauncherPosition(fallback);
    }
  }, [clampLauncherPosition, launcherStorageKey, isMobileViewport]);

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

  const panelAnchor = useMemo(() => {
    const launcherW = isMobileViewport ? LAUNCHER_MOBILE_SIZE : LAUNCHER_W;
    const launcherH = isMobileViewport ? LAUNCHER_MOBILE_SIZE : LAUNCHER_H;

    if (typeof window === "undefined") {
      return { x: launcherPosition.x, y: launcherPosition.y + launcherH + 8 };
    }

    const gap = 8;
    const placeAbove = launcherPosition.y + launcherH + gap + panelSize.height > window.innerHeight - SAFE_MARGIN;
    const preferredY = placeAbove
      ? launcherPosition.y - panelSize.height - gap
      : launcherPosition.y + launcherH + gap;

    const preferredX = launcherPosition.x + launcherW - panelSize.width;

    return {
      x: clamp(preferredX, SAFE_MARGIN, Math.max(SAFE_MARGIN, window.innerWidth - panelSize.width - SAFE_MARGIN)),
      y: clamp(preferredY, SAFE_MARGIN, Math.max(SAFE_MARGIN, window.innerHeight - panelSize.height - SAFE_MARGIN)),
    };
  }, [launcherPosition, panelSize.height, panelSize.width, isMobileViewport]);

  const toastAnchor = useMemo(() => {
    if (typeof window === "undefined") {
      return { x: launcherPosition.x, y: launcherPosition.y };
    }
    return {
      x: clamp(launcherPosition.x + LAUNCHER_W - 280, SAFE_MARGIN, Math.max(SAFE_MARGIN, window.innerWidth - 280 - SAFE_MARGIN)),
      y: clamp(launcherPosition.y - 76, SAFE_MARGIN, Math.max(SAFE_MARGIN, window.innerHeight - 92 - SAFE_MARGIN)),
    };
  }, [launcherPosition]);

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
      const next = clampLauncherPosition(launcherDragRef.current.originX + dx, launcherDragRef.current.originY + dy);
      setLauncherPosition(next);
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
      const next = clampPanelSize(resizingRef.current.startW + dx, resizingRef.current.startH + dy);
      setPanelSize(next);
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

  const markAsRead = useCallback(async (senderId: string) => {
    if (!isAuthenticated) return;
    const readAt = new Date().toISOString();
    await supabase
      .from("chat_messages")
      .update({ read_at: readAt })
      .eq("sender_id", senderId)
      .eq("receiver_id", userIdSafe)
      .is("read_at", null);

    setMessagesByUser((prev) => ({
      ...prev,
      [senderId]: (prev[senderId] || []).map((m) =>
        m.sender_id === senderId && m.receiver_id === userIdSafe && !m.read_at
          ? { ...m, read_at: readAt }
          : m
      ),
    }));
    setUnreadMap((prev) => ({ ...prev, [senderId]: 0 }));
  }, [supabase, userIdSafe, isAuthenticated]);

  const loadChatHistory = useCallback(async (otherUserId: string) => {
    if (!isAuthenticated) return;
    if (messagesByUser[otherUserId]) return;

    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .or(`and(sender_id.eq.${userIdSafe},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userIdSafe})`)
      .order("created_at", { ascending: true })
      .limit(150);

    if (data) {
      setMessagesByUser((prev) => ({ ...prev, [otherUserId]: data }));
    }
  }, [messagesByUser, supabase, userIdSafe, isAuthenticated]);

  const loadRoomHistory = useCallback(async (roomId: string) => {
    if (!isAuthenticated) return;
    if (roomMessagesById[roomId]) return;

    const { data } = await supabase
      .from("chat_room_messages")
      .select("id, room_id, sender_id, content, created_at, sender:profiles!chat_room_messages_sender_id_fkey(id, full_name, avatar_url)")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (data) {
      const normalized = (data as Array<ChatRoomMessage & { sender: ChatRoomMessage["sender"] | ChatRoomMessage["sender"][] }>)
        .map((msg) => ({
          ...msg,
          sender: Array.isArray(msg.sender) ? (msg.sender[0] || null) : (msg.sender || null),
        }));
      setRoomMessagesById((prev) => ({ ...prev, [roomId]: normalized }));
    }
  }, [roomMessagesById, supabase, isAuthenticated]);

  const openConversation = useCallback(async (member: Member) => {
    setIsOpen(true);
    setActiveChatId(member.id);
    setEmojiOpen(false);
    await loadChatHistory(member.id);
    await markAsRead(member.id);
  }, [loadChatHistory, markAsRead]);

  const openRoomConversation = useCallback(async (room: ChatRoom) => {
    setIsOpen(true);
    setChatMode("group");
    setActiveRoomId(room.id);
    setActiveChatId(null);
    setEmojiOpen(false);
    await loadRoomHistory(room.id);
  }, [loadRoomHistory]);

  const sendRoomMessage = useCallback(async (roomId: string, explicitContent?: string) => {
    if (!isAuthenticated) return;
    const draft = explicitContent ?? roomDraftById[roomId] ?? "";
    const content = draft.trim();
    if (!content) return;

    const optimistic: ChatRoomMessage = {
      id: crypto.randomUUID(),
      room_id: roomId,
      sender_id: userIdSafe,
      content,
      created_at: new Date().toISOString(),
      sender: {
        id: userIdSafe,
        full_name: userName,
        avatar_url: null,
      },
    };

    setRoomMessagesById((prev) => ({
      ...prev,
      [roomId]: [...(prev[roomId] || []), optimistic],
    }));

    if (!explicitContent) {
      setRoomDraftById((prev) => ({ ...prev, [roomId]: "" }));
    }

    await supabase.from("chat_room_messages").insert({ room_id: roomId, sender_id: userIdSafe, content });
  }, [isAuthenticated, roomDraftById, userIdSafe, userName, supabase]);

  const createGroupRoom = useCallback(async () => {
    if (!canManageGroups || !isAuthenticated) return;
    const cleanName = newRoomName.trim();
    if (!cleanName) return;

    setCreatingRoom(true);
    try {
      const res = await fetch("/api/chat/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName, memberIds: newRoomMemberIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo crear el grupo");

      const room = data?.room as ChatRoom;
      if (room?.id) {
        setRooms((prev) => [room, ...prev.filter((r) => r.id !== room.id)]);
        setNewRoomName("");
        setNewRoomMemberIds([]);
        setShowCreateRoom(false);
        await openRoomConversation(room);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo crear el grupo");
    } finally {
      setCreatingRoom(false);
    }
  }, [canManageGroups, isAuthenticated, newRoomName, newRoomMemberIds, openRoomConversation]);

  useEffect(() => {
    if (!isAuthenticated) {
      setMembers([]);
      setRooms([]);
      return;
    }

    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, role")
      .neq("id", userIdSafe)
      .order("full_name")
      .then(({ data }) => {
        if (data) setMembers(data);
      });

    supabase
      .from("chat_messages")
      .select("sender_id")
      .eq("receiver_id", userIdSafe)
      .is("read_at", null)
      .then(({ data, error }) => {
        if (error || !data) return;
        const counts: Record<string, number> = {};
        data.forEach((m: { sender_id: string }) => {
          counts[m.sender_id] = (counts[m.sender_id] || 0) + 1;
        });
        setUnreadMap(counts);
      });

    const loadRooms = async () => {
      if (canManageGroups) {
        const { data } = await supabase
          .from("chat_rooms")
          .select("id, name, room_type, task_id")
          .order("created_at", { ascending: false });
        if (data) setRooms(data as ChatRoom[]);
        return;
      }

      const { data } = await supabase
        .from("chat_room_members")
        .select("room:chat_rooms(id, name, room_type, task_id)")
        .eq("user_id", userIdSafe);

      if (!data) return;
      const parsed = (data as Array<{ room: ChatRoom | ChatRoom[] | null }>).map((r) => Array.isArray(r.room) ? r.room[0] : r.room).filter(Boolean) as ChatRoom[];
      setRooms(parsed);
    };

    loadRooms();
  }, [supabase, userIdSafe, isAuthenticated, canManageGroups]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const ch = supabase.channel("team-presence", { config: { presence: { key: userIdSafe } } });

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      const ids = new Set<string>();
      Object.values(state).flat().forEach((p: unknown) => {
        const presence = p as { user_id?: string };
        if (presence.user_id) ids.add(presence.user_id);
      });
      setOnlineIds(ids);
    }).subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ user_id: userIdSafe, user_name: userName });
      }
    });

    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, userIdSafe, userName, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const rx = supabase
      .channel("chat-rx-unified")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `receiver_id=eq.${userIdSafe}` },
        async (payload) => {
          const msg = payload.new as ChatMsg;
          setMessagesByUser((prev) => ({
            ...prev,
            [msg.sender_id]: [...(prev[msg.sender_id] || []), msg],
          }));

          const isCurrentOpen = isOpen && activeChatId === msg.sender_id;
          if (isCurrentOpen) {
            await supabase.from("chat_messages").update({ read_at: new Date().toISOString() }).eq("id", msg.id);
          } else {
            setUnreadMap((prev) => ({ ...prev, [msg.sender_id]: (prev[msg.sender_id] || 0) + 1 }));
            const senderName = members.find((m) => m.id === msg.sender_id)?.full_name || "Nuevo mensaje";
            showToast({ senderId: msg.sender_id, senderName, content: previewText(msg, userIdSafe) });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(rx);
    };
  }, [supabase, userIdSafe, isOpen, activeChatId, members, showToast, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const rxRead = supabase
      .channel("chat-rx-read-receipts")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages", filter: `sender_id=eq.${userIdSafe}` },
        (payload) => {
          const msg = payload.new as ChatMsg;
          if (!msg.read_at) return;
          const otherUserId = msg.receiver_id;

          setMessagesByUser((prev) => ({
            ...prev,
            [otherUserId]: (prev[otherUserId] || []).map((m) => (m.id === msg.id ? { ...m, read_at: msg.read_at } : m)),
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(rxRead);
    };
  }, [supabase, isAuthenticated, userIdSafe]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const roomIds = new Set(rooms.map((r) => r.id));
    const rxRooms = supabase
      .channel("chat-rx-rooms")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_room_messages" },
        async (payload) => {
          const msg = payload.new as ChatRoomMessage;
          if (!roomIds.has(msg.room_id)) return;

          if (msg.sender_id === userIdSafe) return;

          const sender = members.find((m) => m.id === msg.sender_id);
          const withSender: ChatRoomMessage = {
            ...msg,
            sender: sender ? { id: sender.id, full_name: sender.full_name, avatar_url: sender.avatar_url } : null,
          };

          setRoomMessagesById((prev) => ({
            ...prev,
            [msg.room_id]: [...(prev[msg.room_id] || []), withSender],
          }));

          const roomName = rooms.find((r) => r.id === msg.room_id)?.name || "Grupo";
          const isRoomOpen = isOpen && activeRoomId === msg.room_id && chatMode === "group";
          if (!isRoomOpen) {
            showToast({ senderId: msg.room_id, senderName: roomName, content: previewText({ ...msg, receiver_id: "", read_at: null } as ChatMsg, userIdSafe) });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(rxRooms);
    };
  }, [supabase, isAuthenticated, rooms, members, userIdSafe, isOpen, activeRoomId, chatMode, showToast]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const onOpenRoom = async (event: Event) => {
      const custom = event as CustomEvent<{ roomId?: string }>;
      const roomId = custom.detail?.roomId;
      if (!roomId) return;

      const localRoom = rooms.find((r) => r.id === roomId);
      if (localRoom) {
        await openRoomConversation(localRoom);
        return;
      }

      const { data } = await supabase
        .from("chat_rooms")
        .select("id, name, room_type, task_id")
        .eq("id", roomId)
        .maybeSingle();

      if (!data) return;
      const room = data as ChatRoom;
      setRooms((prev) => [room, ...prev.filter((r) => r.id !== room.id)]);
      await openRoomConversation(room);
    };

    window.addEventListener("aphellium-open-chat-room", onOpenRoom as EventListener);
    return () => window.removeEventListener("aphellium-open-chat-room", onOpenRoom as EventListener);
  }, [isAuthenticated, rooms, openRoomConversation, supabase]);

  useEffect(() => {
    if (isOpen && activeChatId) {
      markAsRead(activeChatId);
    }
  }, [isOpen, activeChatId, markAsRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages.length, activeRoomMessages.length]);

  const sendMessage = async (receiverId: string, explicitContent?: string) => {
    if (!isAuthenticated) return;
    const draft = explicitContent ?? draftByUser[receiverId] ?? "";
    const content = draft.trim();
    if (!content) return;

    const optimistic: ChatMsg = {
      id: crypto.randomUUID(),
      sender_id: userIdSafe,
      receiver_id: receiverId,
      content,
      created_at: new Date().toISOString(),
      read_at: null,
    };

    setMessagesByUser((prev) => ({
      ...prev,
      [receiverId]: [...(prev[receiverId] || []), optimistic],
    }));

    if (!explicitContent) {
      setDraftByUser((prev) => ({ ...prev, [receiverId]: "" }));
    }

    await supabase.from("chat_messages").insert({ sender_id: userIdSafe, receiver_id: receiverId, content });
  };

  const sendFile = async (receiverId: string, file: File) => {
    if (!isAuthenticated) return;
    if (!file || file.size === 0) return;
    if (file.size > 15 * 1024 * 1024) {
      alert("El archivo excede el maximo de 15MB.");
      return;
    }

    setUploadingByUser((prev) => ({ ...prev, [receiverId]: true }));

    try {
      const fd = new FormData();
      fd.set("file", file);

      const res = await fetch("/api/chat/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo subir el archivo");

      const payload = serializeFileMessage({
        name: data.fileName,
        url: data.url,
        mimeType: data.mimeType,
        size: data.size,
        storagePath: data.storagePath,
      });

      await sendMessage(receiverId, payload);
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo subir el archivo");
    } finally {
      setUploadingByUser((prev) => ({ ...prev, [receiverId]: false }));
    }
  };

  const updateMessage = async (otherUserId: string, messageId: string, content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return { error: "Mensaje vacio" };

    const res = await fetch(`/api/chat/messages/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: trimmed }),
    });

    const data = await res.json();
    if (!res.ok) return { error: data?.error || "No se pudo editar" };

    setMessagesByUser((prev) => ({
      ...prev,
      [otherUserId]: (prev[otherUserId] || []).map((m) => (m.id === messageId ? { ...m, content: trimmed } : m)),
    }));

    return { success: true };
  };

  const deleteMessage = async (otherUserId: string, messageId: string) => {
    const res = await fetch(`/api/chat/messages/${messageId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return { error: data?.error || "No se pudo eliminar" };

    setMessagesByUser((prev) => ({
      ...prev,
      [otherUserId]: (prev[otherUserId] || []).filter((m) => m.id !== messageId),
    }));

    return { success: true };
  };

  const filteredMembers = useMemo(() => {
    return [...members]
      .filter((m) => !searchQ || m.full_name?.toLowerCase().includes(searchQ.toLowerCase()))
      .sort((a, b) => {
        const aOn = onlineIds.has(a.id) ? 0 : 1;
        const bOn = onlineIds.has(b.id) ? 0 : 1;
        if (aOn !== bOn) return aOn - bOn;
        const aUn = unreadMap[a.id] || 0;
        const bUn = unreadMap[b.id] || 0;
        if (aUn !== bUn) return bUn - aUn;
        return (a.full_name || "").localeCompare(b.full_name || "");
      });
  }, [members, searchQ, onlineIds, unreadMap]);

  const activeDraft = activeChatId ? draftByUser[activeChatId] || "" : "";
  const activeUploading = activeChatId ? !!uploadingByUser[activeChatId] : false;
  const activeRoomDraft = activeRoomId ? roomDraftById[activeRoomId] || "" : "";
  const hasActiveDirect = !!activeChatId;
  const hasActiveRoom = !!activeRoomId;

  return (
    <>
      <button
        onPointerDown={startLauncherDrag}
        className={`fixed z-[70] flex items-center gap-2 px-4 py-3 rounded-2xl bg-[var(--bg-darker)] border border-white/10 shadow-2xl hover:border-[var(--accent-green)]/50 transition-all duration-200 ${isMobileViewport ? "cursor-pointer" : "cursor-move"} select-none`}
        style={isMobileViewport
          ? { left: launcherPosition.x, top: launcherPosition.y, width: LAUNCHER_MOBILE_SIZE, height: LAUNCHER_MOBILE_SIZE, borderRadius: 16, touchAction: "none" }
          : { left: launcherPosition.x, top: launcherPosition.y, width: LAUNCHER_W, height: LAUNCHER_H }}
      >
        <div className="relative">
          <MessageCircle size={20} className="text-[var(--accent-green)]" />
          {totalUnread > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center animate-pulse">
              {totalUnread > 9 ? "9+" : totalUnread}
            </span>
          )}
        </div>
        <span className="text-sm font-medium text-white hidden sm:inline">Chat</span>
        {onlineCount > 0 && (
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-400/20 px-1.5 py-0.5 rounded-full font-semibold hidden sm:inline">
            {onlineCount} online
          </span>
        )}
      </button>

      {toast && !isOpen && (
        <button
          onClick={() => {
            const target = members.find((m) => m.id === toast.senderId);
            if (target) {
              openConversation(target);
            } else {
              const room = rooms.find((r) => r.id === toast.senderId);
              if (room) openRoomConversation(room);
            }
            setToast(null);
          }}
          className="fixed z-[70] w-[280px] rounded-xl border border-emerald-400/20 bg-[rgba(3,10,18,0.96)] p-3 text-left shadow-2xl hover:border-emerald-300/40 transition-colors"
          style={{ left: toastAnchor.x, top: toastAnchor.y }}
        >
          <p className="text-xs text-emerald-300 font-semibold">{toast.senderName}</p>
          <p className="text-xs text-gray-300 truncate mt-1">{toast.content}</p>
        </button>
      )}

      {isOpen && (
        <div
          className={`fixed z-[69] border border-white/10 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 ${isMobileViewport ? "rounded-2xl" : "rounded-3xl"}`}
          style={{
            width: panelSize.width,
            height: panelSize.height,
            left: panelAnchor.x,
            top: panelAnchor.y,
            background: "linear-gradient(180deg, rgba(6, 13, 26, 0.98) 0%, rgba(2, 6, 14, 0.96) 100%)",
            backdropFilter: "blur(24px)",
          }}
        >
          <div className="h-12 shrink-0 border-b border-white/10 bg-gradient-to-r from-cyan-500/10 via-transparent to-emerald-500/10 px-3 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {!isAuthenticated && visitorMode !== "menu" ? (
                <button
                  type="button"
                  onClick={() => { setVisitorMode("menu"); setVisitorDraft(""); }}
                  className="p-1.5 rounded-lg text-gray-300 hover:bg-white/10"
                >
                  <ArrowLeft size={14} />
                </button>
              ) : hasActiveDirect || hasActiveRoom ? (
                <button
                  type="button"
                  onClick={() => {
                    setActiveChatId(null);
                    setActiveRoomId(null);
                    setEmojiOpen(false);
                    setEditingId(null);
                    setMessageMenuId(null);
                  }}
                  className="p-1.5 rounded-lg text-gray-300 hover:bg-white/10"
                >
                  <ArrowLeft size={14} />
                </button>
              ) : (
                <MessageCircle size={16} className="text-[var(--accent-green)]" />
              )}

              <div className="min-w-0">
                <p className="text-sm text-white font-semibold truncate">
                  {!isAuthenticated
                    ? (visitorMode === "ai" ? "Aphellium AI" : visitorMode === "support" ? "Soporte Técnico" : "Aphellium Chat")
                    : (!hasActiveDirect && !hasActiveRoom && chatMode === "ai")
                    ? "Aphellium AI"
                    : (!hasActiveDirect && !hasActiveRoom && chatMode === "support")
                    ? "Soporte Técnico"
                    : hasActiveRoom ? (activeRoom?.name || "Grupo") : activeMember ? (activeMember.full_name || "Sin nombre") : "Chat interno"}
                </p>
                <p className="text-[10px] text-gray-400">
                  {!isAuthenticated
                    ? (visitorMode === "ai" ? "Respuestas instantáneas" : visitorMode === "support" ? "Chat en vivo" : "¿Cómo te podemos ayudar?")
                    : (!hasActiveDirect && !hasActiveRoom && chatMode === "ai")
                    ? "Asistente inteligente de Aphellium"
                    : (!hasActiveDirect && !hasActiveRoom && chatMode === "support")
                    ? "Atención en vivo con nuestro equipo"
                    : hasActiveRoom
                    ? (activeRoom?.room_type === "task" ? "Grupo de tarea" : "Grupo manual")
                    : activeMember
                    ? (onlineIds.has(activeMember.id) ? "En linea" : "Desconectado")
                    : `${onlineCount} conectados`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setEmojiOpen(false);
              }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <X size={14} />
            </button>
          </div>

          {!isAuthenticated ? (
            visitorMode === "menu" ? (
              <div className="flex-1 flex items-center justify-center p-6 text-center">
                <div className="space-y-4 max-w-[280px]">
                  <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-white/10 flex items-center justify-center">
                    <MessageCircle size={24} className="text-emerald-300" />
                  </div>
                  <p className="text-sm text-white font-semibold">¡Hola! ¿En qué podemos ayudarte?</p>
                  <p className="text-xs text-gray-400">Elige una opción para comenzar</p>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setVisitorMode("ai");
                        if (visitorAiMessages.length === 0) {
                          setVisitorAiMessages([{
                            id: "welcome-ai",
                            role: "assistant",
                            content: "¡Hola! Soy Aphellium AI. Puedo ayudarte con información sobre nuestros productos, servicios y tecnología. ¿En qué puedo ayudarte?",
                            timestamp: new Date().toISOString(),
                          }]);
                        }
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-cyan-400/20 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0">
                        <Bot size={18} className="text-cyan-300" />
                      </div>
                      <div>
                        <p className="text-xs text-white font-semibold">Aphellium AI</p>
                        <p className="text-[10px] text-gray-400">Respuestas instantáneas sobre Aphellium</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => startSupportConversation(false)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <Headset size={18} className="text-emerald-300" />
                      </div>
                      <div>
                        <p className="text-xs text-white font-semibold">Soporte Técnico</p>
                        <p className="text-[10px] text-gray-400">Habla con nuestro equipo en vivo</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            ) : visitorMode === "ai" ? (
              <>
                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.06),_transparent_45%)]">
                  {visitorAiMessages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.role === "system" ? (
                        <div className="w-full space-y-2">
                          <div className="mx-auto max-w-[90%] p-3 rounded-xl border border-amber-400/20 bg-amber-500/10 text-center">
                            <p className="text-xs text-amber-200">{msg.content}</p>
                          </div>
                          <div className="flex justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => startSupportConversation(true)}
                              className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-400/20 hover:bg-emerald-500/30 transition-colors flex items-center gap-1.5"
                            >
                              <Headset size={12} /> Sí, conectar con asesor
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setVisitorAiMessages((prev) => prev.filter((m) => m.role !== "system"));
                              }}
                              className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-white/10 text-gray-300 hover:bg-white/15 transition-colors"
                            >
                              Continuar con IA
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className={`max-w-[85%] flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                          {msg.role === "assistant" && (
                            <span className="text-[10px] text-cyan-300 mb-1 px-1 flex items-center gap-1"><Bot size={10} /> Aphellium AI</span>
                          )}
                          <div className={`px-3 py-2 text-xs leading-relaxed break-words shadow-lg whitespace-pre-wrap ${
                            msg.role === "user"
                              ? "bg-gradient-to-br from-cyan-400/35 to-cyan-500/20 text-white rounded-2xl rounded-br-md border border-cyan-300/20"
                              : "bg-white/[0.08] text-gray-100 rounded-2xl rounded-bl-md border border-white/10"
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {visitorAiLoading && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.08] rounded-2xl rounded-bl-md border border-white/10">
                        <Loader2 size={14} className="text-cyan-300 animate-spin" />
                        <span className="text-xs text-gray-400">Escribiendo...</span>
                      </div>
                    </div>
                  )}
                  <div ref={visitorMessagesEndRef} />
                </div>
                <div className="px-3 py-2 border-t border-white/10 bg-black/40 shrink-0">
                  <div className="flex items-center gap-1.5 w-full">
                    <input
                      value={visitorDraft}
                      onChange={(e) => setVisitorDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendVisitorAiMessage(visitorDraft);
                        }
                      }}
                      placeholder="Escribe tu pregunta..."
                      className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-cyan-400/50 transition-colors"
                      disabled={visitorAiLoading}
                    />
                    <button
                      type="button"
                      onClick={() => sendVisitorAiMessage(visitorDraft)}
                      disabled={!visitorDraft.trim() || visitorAiLoading}
                      className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-colors disabled:opacity-30"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => startSupportConversation(false)}
                    className="mt-2 w-full text-center text-[10px] text-gray-500 hover:text-emerald-300 transition-colors flex items-center justify-center gap-1"
                  >
                    <ArrowRightCircle size={10} /> ¿Prefieres hablar con una persona?
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.06),_transparent_45%)]">
                  {visitorSupportMessages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-500 text-xs text-center px-6">
                      <div className="space-y-2">
                        <Headset size={24} className="mx-auto text-emerald-300/50" />
                        <p>Conectando con soporte técnico...</p>
                        <p className="text-[10px]">Un asesor responderá pronto</p>
                      </div>
                    </div>
                  ) : (
                    visitorSupportMessages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : msg.role === "system" ? "justify-center" : "justify-start"}`}>
                        {msg.role === "system" ? (
                          <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                            <p className="text-[10px] text-gray-400">{msg.content}</p>
                          </div>
                        ) : (
                          <div className={`max-w-[85%] flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                            {msg.role === "assistant" && (
                              <span className="text-[10px] text-emerald-300 mb-1 px-1 flex items-center gap-1"><Headset size={10} /> Soporte</span>
                            )}
                            <div className={`px-3 py-2 text-xs leading-relaxed break-words shadow-lg ${
                              msg.role === "user"
                                ? "bg-gradient-to-br from-emerald-400/35 to-emerald-500/20 text-white rounded-2xl rounded-br-md border border-emerald-300/20"
                                : "bg-white/[0.08] text-gray-100 rounded-2xl rounded-bl-md border border-white/10"
                            }`}>
                              {msg.content}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  <div ref={visitorMessagesEndRef} />
                </div>
                <div className="px-3 py-2 border-t border-white/10 bg-black/40 shrink-0">
                  {visitorSupportStatus === "closed" ? (
                    <p className="text-center text-xs text-gray-500 py-1">Esta conversación ha sido cerrada</p>
                  ) : (
                    <div className="flex items-center gap-1.5 w-full">
                      <input
                        value={visitorDraft}
                        onChange={(e) => setVisitorDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendVisitorSupportMessage(visitorDraft);
                          }
                        }}
                        placeholder="Escribe tu mensaje..."
                        className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-emerald-400/50 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => sendVisitorSupportMessage(visitorDraft)}
                        disabled={!visitorDraft.trim()}
                        className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors disabled:opacity-30"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )
          ) : !hasActiveDirect && !hasActiveRoom ? (
            <>
              <div className="px-3 py-2 border-b border-white/5">
                <div className="mb-2 grid grid-cols-4 gap-1 rounded-lg bg-white/5 p-1">
                  <button
                    type="button"
                    onClick={() => setChatMode("direct")}
                    className={`h-7 rounded-md text-[11px] font-medium transition-colors ${chatMode === "direct" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}
                  >
                    Directos
                  </button>
                  <button
                    type="button"
                    onClick={() => setChatMode("group")}
                    className={`h-7 rounded-md text-[11px] font-medium transition-colors ${chatMode === "group" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}
                  >
                    Grupos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChatMode("ai");
                      if (visitorAiMessages.length === 0) {
                        setVisitorAiMessages([{
                          id: "welcome-ai-auth",
                          role: "assistant",
                          content: "¡Hola! Soy Aphellium AI. Estoy listo para ayudarte con información sobre Aphellium.",
                          timestamp: new Date().toISOString(),
                        }]);
                      }
                    }}
                    className={`h-7 rounded-md text-[11px] font-medium transition-colors ${chatMode === "ai" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}
                  >
                    Aphellium AI
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChatMode("support");
                      if (!visitorSupportConvId) {
                        startSupportConversation(false);
                      }
                    }}
                    className={`h-7 rounded-md text-[11px] font-medium transition-colors ${chatMode === "support" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}
                  >
                    Soporte
                  </button>
                </div>

                {chatMode !== "ai" && chatMode !== "support" && (
                  <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-1.5">
                  <Search size={14} className="text-gray-500 shrink-0" />
                  <input
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    placeholder={chatMode === "direct" ? "Buscar contacto..." : "Buscar grupo..."}
                    className="bg-transparent text-xs text-white placeholder-gray-600 outline-none w-full"
                  />
                  {chatMode === "group" && canManageGroups && (
                    <button
                      type="button"
                      onClick={() => setShowCreateRoom((prev) => !prev)}
                      className="h-6 w-6 rounded-md bg-white/10 text-gray-200 hover:bg-white/20 inline-flex items-center justify-center"
                      title="Crear grupo"
                    >
                      <Plus size={12} />
                    </button>
                  )}
                  </div>
                )}

                {chatMode === "group" && showCreateRoom && canManageGroups && (
                  <div className="mt-2 rounded-lg border border-white/10 bg-black/30 p-2 space-y-2">
                    <input
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      placeholder="Nombre del grupo"
                      className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white outline-none focus:border-[var(--accent-green)]/50"
                    />
                    <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                      {members.map((m) => (
                        <label key={m.id} className="flex items-center gap-2 text-[11px] text-gray-300">
                          <input
                            type="checkbox"
                            checked={newRoomMemberIds.includes(m.id)}
                            onChange={() => setNewRoomMemberIds((prev) => prev.includes(m.id) ? prev.filter((x) => x !== m.id) : [...prev, m.id])}
                          />
                          <span className="truncate">{m.full_name || "Sin nombre"}</span>
                        </label>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={createGroupRoom}
                      disabled={creatingRoom || !newRoomName.trim()}
                      className="w-full h-7 rounded-md bg-emerald-500/20 text-emerald-200 text-[11px] font-semibold disabled:opacity-40"
                    >
                      {creatingRoom ? "Creando..." : "Crear grupo"}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto">
                {chatMode === "ai" ? (
                  <div className="h-full flex flex-col">
                    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.06),_transparent_45%)]">
                      {visitorAiMessages.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-gray-500 text-xs text-center px-6">
                          Escribe para empezar a conversar con Aphellium AI
                        </div>
                      ) : (
                        visitorAiMessages.map((msg) => (
                          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[85%] flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                              {msg.role === "assistant" && (
                                <span className="text-[10px] text-cyan-300 mb-1 px-1 flex items-center gap-1"><Bot size={10} /> Aphellium AI</span>
                              )}
                              <div className={`px-3 py-2 text-xs leading-relaxed break-words shadow-lg whitespace-pre-wrap ${
                                msg.role === "user"
                                  ? "bg-gradient-to-br from-cyan-400/35 to-cyan-500/20 text-white rounded-2xl rounded-br-md border border-cyan-300/20"
                                  : "bg-white/[0.08] text-gray-100 rounded-2xl rounded-bl-md border border-white/10"
                              }`}>
                                {msg.content}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                      {visitorAiLoading && (
                        <div className="flex justify-start">
                          <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.08] rounded-2xl rounded-bl-md border border-white/10">
                            <Loader2 size={14} className="text-cyan-300 animate-spin" />
                            <span className="text-xs text-gray-400">Escribiendo...</span>
                          </div>
                        </div>
                      )}
                      <div ref={visitorMessagesEndRef} />
                    </div>
                    <div className="px-3 py-2 border-t border-white/10 bg-black/40 shrink-0">
                      <div className="flex items-center gap-1.5 w-full">
                        <input
                          value={visitorDraft}
                          onChange={(e) => setVisitorDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              sendVisitorAiMessage(visitorDraft);
                            }
                          }}
                          placeholder="Escribe tu pregunta..."
                          className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-cyan-400/50 transition-colors"
                          disabled={visitorAiLoading}
                        />
                        <button
                          type="button"
                          onClick={() => sendVisitorAiMessage(visitorDraft)}
                          disabled={!visitorDraft.trim() || visitorAiLoading}
                          className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-colors disabled:opacity-30"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : chatMode === "support" ? (
                  <div className="h-full flex flex-col">
                    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.06),_transparent_45%)]">
                      {visitorSupportMessages.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-gray-500 text-xs text-center px-6">
                          <div className="space-y-2">
                            <Headset size={24} className="mx-auto text-emerald-300/50" />
                            <p>Conectando con soporte técnico...</p>
                            <p className="text-[10px]">Un asesor responderá pronto</p>
                          </div>
                        </div>
                      ) : (
                        visitorSupportMessages.map((msg) => (
                          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : msg.role === "system" ? "justify-center" : "justify-start"}`}>
                            {msg.role === "system" ? (
                              <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                                <p className="text-[10px] text-gray-400">{msg.content}</p>
                              </div>
                            ) : (
                              <div className={`max-w-[85%] flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                                {msg.role === "assistant" && (
                                  <span className="text-[10px] text-emerald-300 mb-1 px-1 flex items-center gap-1"><Headset size={10} /> Soporte</span>
                                )}
                                <div className={`px-3 py-2 text-xs leading-relaxed break-words shadow-lg ${
                                  msg.role === "user"
                                    ? "bg-gradient-to-br from-emerald-400/35 to-emerald-500/20 text-white rounded-2xl rounded-br-md border border-emerald-300/20"
                                    : "bg-white/[0.08] text-gray-100 rounded-2xl rounded-bl-md border border-white/10"
                                }`}>
                                  {msg.content}
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                      <div ref={visitorMessagesEndRef} />
                    </div>
                    <div className="px-3 py-2 border-t border-white/10 bg-black/40 shrink-0">
                      {visitorSupportStatus === "closed" ? (
                        <p className="text-center text-xs text-gray-500 py-1">Esta conversación ha sido cerrada</p>
                      ) : (
                        <div className="flex items-center gap-1.5 w-full">
                          <input
                            value={visitorDraft}
                            onChange={(e) => setVisitorDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                sendVisitorSupportMessage(visitorDraft);
                              }
                            }}
                            placeholder="Escribe tu mensaje..."
                            className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-emerald-400/50 transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => sendVisitorSupportMessage(visitorDraft)}
                            disabled={!visitorDraft.trim()}
                            className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors disabled:opacity-30"
                          >
                            <Send size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : chatMode === "direct" ? (
                  filteredMembers.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 text-xs">No hay resultados</div>
                  ) : (
                  filteredMembers.map((m) => {
                    const unread = unreadMap[m.id] || 0;
                    const isOnline = onlineIds.has(m.id);
                    const lastMsg = (messagesByUser[m.id] || []).slice(-1)[0];

                    return (
                      <button
                        key={m.id}
                        onClick={() => openConversation(m)}
                        className="w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors flex items-center gap-2"
                      >
                        <div className="relative shrink-0">
                          {m.avatar_url ? (
                            <img src={m.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover border border-white/10" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/30 to-emerald-500/30 flex items-center justify-center text-xs font-bold text-white border border-white/10">
                              {initials(m.full_name)}
                            </div>
                          )}
                          <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-darker)] ${isOnline ? "bg-emerald-400" : "bg-gray-600"}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-xs truncate ${unread > 0 ? "text-white font-semibold" : "text-gray-300"}`}>
                              {m.full_name || "Sin nombre"}
                            </p>
                            {lastMsg && <span className="text-[10px] text-gray-600 shrink-0">{fmtTime(lastMsg.created_at)}</span>}
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] text-gray-500 truncate">{previewText(lastMsg, userIdSafe)}</p>
                            {unread > 0 && (
                              <span className="bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                                {unread > 9 ? "9+" : unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                  )
                ) : (
                  (() => {
                    const filteredRooms = rooms.filter((r) => !searchQ || r.name.toLowerCase().includes(searchQ.toLowerCase()));
                    if (filteredRooms.length === 0) {
                      return <div className="p-6 text-center text-gray-500 text-xs">No hay grupos todavía</div>;
                    }

                    return filteredRooms.map((room) => {
                      const last = (roomMessagesById[room.id] || []).slice(-1)[0];
                      return (
                        <button
                          key={room.id}
                          onClick={() => openRoomConversation(room)}
                          className="w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors flex items-center gap-2"
                        >
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-fuchsia-500/25 to-cyan-500/25 border border-white/10 inline-flex items-center justify-center text-white">
                            <Users size={14} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs text-white truncate">{room.name}</p>
                              {last && <span className="text-[10px] text-gray-600 shrink-0">{fmtTime(last.created_at)}</span>}
                            </div>
                            <p className="text-[11px] text-gray-500 truncate">
                              {last ? previewText({ ...last, receiver_id: "", read_at: null } as ChatMsg, userIdSafe) : (room.room_type === "task" ? "Grupo de tarea" : "Grupo manual")}
                            </p>
                          </div>
                        </button>
                      );
                    });
                  })()
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.08),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(16,185,129,0.08),_transparent_45%)]">
                {hasActiveRoom ? (
                  activeRoomMessages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-500 text-xs text-center px-6">
                      Inicia la conversación en {activeRoom?.name || "el grupo"}
                    </div>
                  ) : (
                    activeRoomMessages.map((msg, i) => {
                      const isMine = msg.sender_id === userIdSafe;
                      const showTime = i === 0 || new Date(msg.created_at).getTime() - new Date(activeRoomMessages[i - 1].created_at).getTime() > 300_000;
                      const filePayload = parseFileMessage(msg.content);
                      const kind = getAttachmentKind(filePayload);

                      return (
                        <div key={msg.id}>
                          {showTime && (
                            <div className="text-center my-2">
                              <span className="text-[10px] text-gray-600 bg-white/[0.03] px-2 py-0.5 rounded-full">{fmtTime(msg.created_at)}</span>
                            </div>
                          )}

                          <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[88%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                              {!isMine && (
                                <span className="text-[10px] text-cyan-300 mb-1 px-1">{msg.sender?.full_name || "Miembro"}</span>
                              )}
                              <div
                                className={`px-3 py-2 text-xs leading-relaxed break-words shadow-lg ${
                                  isMine
                                    ? "bg-gradient-to-br from-cyan-400/35 to-cyan-500/20 text-white rounded-2xl rounded-br-md border border-cyan-300/20"
                                    : "bg-white/[0.08] text-gray-100 rounded-2xl rounded-bl-md border border-white/10"
                                }`}
                              >
                                {filePayload ? (
                                  kind === "image" ? (
                                    <button type="button" onClick={() => setLightbox({ url: filePayload.url, name: filePayload.name, kind: "image" })} className="block">
                                      <img src={filePayload.url} alt={filePayload.name} className="max-h-52 w-auto rounded-lg border border-white/10" loading="lazy" />
                                      <div className="mt-1 text-[10px] opacity-80 truncate" title={filePayload.name}>{filePayload.name}</div>
                                    </button>
                                  ) : kind === "video" ? (
                                    <button
                                      type="button"
                                      onClick={() => setLightbox({ url: filePayload.url, name: filePayload.name, kind: "video" })}
                                      className="space-y-1 text-left"
                                    >
                                      <video src={filePayload.url} preload="metadata" muted className="max-h-56 w-full rounded-lg border border-white/10 bg-black" />
                                      <p className="text-[10px] underline underline-offset-2 opacity-80">Abrir video: {filePayload.name}</p>
                                    </button>
                                  ) : (
                                    <a href={filePayload.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:opacity-90">
                                      <FileText size={14} className="shrink-0" />
                                      <span className="truncate max-w-[130px]" title={filePayload.name}>{filePayload.name}</span>
                                      <span className="text-[10px] opacity-80">{formatBytes(filePayload.size)}</span>
                                      <Download size={12} className="shrink-0" />
                                    </a>
                                  )
                                ) : (
                                  msg.content
                                )}
                              </div>
                              <span className="text-[10px] text-gray-500 mt-1 px-1">{fmtTime(msg.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )
                ) : activeMessages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-500 text-xs text-center px-6">
                    Inicia una conversacion con {activeMember?.full_name?.split(" ")[0] || "tu contacto"}
                  </div>
                ) : (
                  activeMessages.map((msg, i) => {
                    const isMine = msg.sender_id === userIdSafe;
                    const showTime = i === 0 || new Date(msg.created_at).getTime() - new Date(activeMessages[i - 1].created_at).getTime() > 300_000;
                    const filePayload = parseFileMessage(msg.content);
                    const kind = getAttachmentKind(filePayload);
                    const isEditing = editingId === msg.id;

                    return (
                      <div key={msg.id}>
                        {showTime && (
                          <div className="text-center my-2">
                            <span className="text-[10px] text-gray-600 bg-white/[0.03] px-2 py-0.5 rounded-full">{fmtTime(msg.created_at)}</span>
                          </div>
                        )}

                        <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[88%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                            <div
                              className={`px-3 py-2 text-xs leading-relaxed break-words shadow-lg ${
                                isMine
                                  ? "bg-gradient-to-br from-cyan-400/35 to-cyan-500/20 text-white rounded-2xl rounded-br-md border border-cyan-300/20"
                                  : "bg-white/[0.08] text-gray-100 rounded-2xl rounded-bl-md border border-white/10"
                              }`}
                            >
                              {isEditing ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    rows={3}
                                    className="w-full rounded-md bg-black/30 border border-white/20 px-2 py-1 text-xs text-white outline-none"
                                  />
                                  <div className="flex justify-end gap-1">
                                    <button type="button" onClick={() => { setEditingId(null); setEditingText(""); }} className="px-2 py-1 rounded bg-white/10 text-[10px]">Cancelar</button>
                                    <button
                                      type="button"
                                      disabled={busyId === msg.id}
                                      onClick={async () => {
                                        if (!activeChatId) return;
                                        setBusyId(msg.id);
                                        const result = await updateMessage(activeChatId, msg.id, editingText);
                                        setBusyId(null);
                                        if (result.error) {
                                          alert(result.error);
                                          return;
                                        }
                                        setEditingId(null);
                                        setEditingText("");
                                        setMessageMenuId(null);
                                      }}
                                      className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 text-[10px] disabled:opacity-50"
                                    >
                                      Guardar
                                    </button>
                                  </div>
                                </div>
                              ) : filePayload ? (
                                kind === "image" ? (
                                  <button type="button" onClick={() => setLightbox({ url: filePayload.url, name: filePayload.name, kind: "image" })} className="block">
                                    <img src={filePayload.url} alt={filePayload.name} className="max-h-52 w-auto rounded-lg border border-white/10" loading="lazy" />
                                    <div className="mt-1 text-[10px] opacity-80 truncate" title={filePayload.name}>{filePayload.name}</div>
                                  </button>
                                ) : kind === "video" ? (
                                  <button
                                    type="button"
                                    onClick={() => setLightbox({ url: filePayload.url, name: filePayload.name, kind: "video" })}
                                    className="space-y-1 text-left"
                                  >
                                    <video src={filePayload.url} preload="metadata" muted className="max-h-56 w-full rounded-lg border border-white/10 bg-black" />
                                    <p className="text-[10px] underline underline-offset-2 opacity-80">Abrir video: {filePayload.name}</p>
                                  </button>
                                ) : (
                                  <a href={filePayload.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:opacity-90">
                                    <FileText size={14} className="shrink-0" />
                                    <span className="truncate max-w-[130px]" title={filePayload.name}>{filePayload.name}</span>
                                    <span className="text-[10px] opacity-80">{formatBytes(filePayload.size)}</span>
                                    <Download size={12} className="shrink-0" />
                                  </a>
                                )
                              ) : (
                                msg.content
                              )}

                              {isMine && !isEditing && (
                                <div className="mt-1 flex justify-end">
                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={() => setMessageMenuId((prev) => (prev === msg.id ? null : msg.id))}
                                      className="p-1 rounded bg-white/10 hover:bg-white/20"
                                      title="Opciones"
                                    >
                                      <MoreVertical size={11} />
                                    </button>

                                    {messageMenuId === msg.id && (
                                      <div className="absolute right-0 top-7 min-w-[130px] rounded-lg border border-white/10 bg-[rgba(4,10,18,0.98)] shadow-xl p-1 z-20">
                                        {!filePayload && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingId(msg.id);
                                              setEditingText(msg.content);
                                              setMessageMenuId(null);
                                            }}
                                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] text-gray-200 hover:bg-white/10"
                                          >
                                            <Pencil size={11} /> Editar
                                          </button>
                                        )}

                                        <button
                                          type="button"
                                          disabled={busyId === msg.id}
                                          onClick={async () => {
                                            if (!activeChatId) return;
                                            if (!window.confirm("Deseas eliminar este mensaje?")) return;
                                            setBusyId(msg.id);
                                            const result = await deleteMessage(activeChatId, msg.id);
                                            setBusyId(null);
                                            setMessageMenuId(null);
                                            if (result.error) alert(result.error);
                                          }}
                                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                                        >
                                          {busyId === msg.id ? <Check size={11} /> : <Trash2 size={11} />} Eliminar
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-500 mt-1 px-1">
                              {fmtTime(msg.created_at)}
                              {isMine && (msg.read_at ? " · Visto" : " · Enviado")}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="px-3 py-2 border-t border-white/10 bg-black/40 shrink-0">
                {emojiOpen && (
                  <div className="mb-2 p-2 rounded-xl border border-white/10 bg-black/40 grid grid-cols-6 gap-1">
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          if (hasActiveRoom && activeRoomId) {
                            setRoomDraftById((prev) => ({ ...prev, [activeRoomId]: `${activeRoomDraft}${emoji}` }));
                            return;
                          }
                          if (activeChatId) {
                            setDraftByUser((prev) => ({ ...prev, [activeChatId]: `${activeDraft}${emoji}` }));
                          }
                        }}
                        className="h-7 w-7 rounded-lg hover:bg-white/10 text-base"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1.5 w-full">
                  <input
                    value={hasActiveRoom ? activeRoomDraft : activeDraft}
                    onChange={(e) => {
                      if (hasActiveRoom && activeRoomId) {
                        setRoomDraftById((prev) => ({ ...prev, [activeRoomId]: e.target.value }));
                        return;
                      }
                      if (activeChatId) {
                        setDraftByUser((prev) => ({ ...prev, [activeChatId]: e.target.value }));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && (activeChatId || activeRoomId)) {
                        e.preventDefault();
                        if (hasActiveRoom && activeRoomId) {
                          sendRoomMessage(activeRoomId);
                        } else if (activeChatId) {
                          sendMessage(activeChatId);
                        }
                      }
                    }}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-[var(--accent-green)]/50 transition-colors"
                  />

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && activeChatId) sendFile(activeChatId, file);
                      e.currentTarget.value = "";
                    }}
                  />

                  <button type="button" onClick={() => setEmojiOpen((prev) => !prev)} className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-xl bg-white/10 text-gray-200 hover:bg-white/20 transition-colors" title="Emojis">
                    <Smile size={14} />
                  </button>

                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={activeUploading || !activeChatId || hasActiveRoom} className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-xl bg-white/10 text-gray-200 hover:bg-white/20 transition-colors disabled:opacity-40" title={hasActiveRoom ? "Adjuntos disponibles en chat directo" : "Adjuntar archivo"}>
                    <Paperclip size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (hasActiveRoom && activeRoomId) {
                        sendRoomMessage(activeRoomId);
                        return;
                      }
                      if (activeChatId) sendMessage(activeChatId);
                    }}
                    disabled={!(hasActiveRoom ? activeRoomDraft.trim() : activeDraft.trim()) || activeUploading || (!activeChatId && !activeRoomId)}
                    className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-xl bg-[var(--accent-green)]/20 text-[var(--accent-green)] hover:bg-[var(--accent-green)]/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Send size={14} />
                  </button>
                </div>

                {activeUploading && <p className="text-[10px] text-gray-500 mt-1">Subiendo archivo...</p>}
              </div>
            </>
          )}

          {lightbox && (
            <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
              <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => setLightbox(null)} className="absolute -top-10 right-0 p-2 rounded-full bg-white/10 text-white hover:bg-white/20">
                  <X size={16} />
                </button>
                {lightbox.kind === "image" ? (
                  <img src={lightbox.url} alt={lightbox.name} className="max-w-[90vw] max-h-[85vh] rounded-xl border border-white/10" />
                ) : (
                  <video
                    src={lightbox.url}
                    controls
                    autoPlay
                    className="max-w-[90vw] max-h-[85vh] rounded-xl border border-white/10 bg-black"
                  />
                )}
                <p className="mt-2 text-xs text-gray-300 text-center truncate" title={lightbox.name}>{lightbox.name}</p>
              </div>
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
        </div>
      )}
    </>
  );
}
