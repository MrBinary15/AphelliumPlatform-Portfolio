"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Mic, MicOff, Camera, CameraOff, PhoneOff, Crown,
  MonitorUp, MonitorOff, Hand, Smile, MessageCircle,
  MoreHorizontal, Lock, Unlock, Maximize, Minimize,
  Pencil, WifiOff, Volume2, Signal, ChevronDown, X, Globe,
} from "lucide-react";
import { useWebRTC, type ConnectionQuality } from "@/hooks/useWebRTC";
import { playOutgoingRing, playJoinSound, playLeaveSound, playCallEndSound, playScreenShareSound } from "@/hooks/useMeetingSounds";
import { useReactions, FloatingReactions, HandRaiseBanner, ReactionPicker } from "@/components/meeting/MeetingReactions";
import MeetingChat from "@/components/meeting/MeetingChat";
import ScreenAnnotation from "@/components/meeting/ScreenAnnotation";
import { endMeeting, listPendingJoinApprovals, resetMeetingSignals, respondJoinApproval, toggleMeetingLock } from "../../actions";
import { createClient } from "@/utils/supabase/client";

/* ---- Types ---- */

interface MeetingSettings {
  allow_chat?: boolean;
  allow_screen_share?: boolean;
  allow_hand_raise?: boolean;
  allow_annotations?: boolean;
  mute_on_join?: boolean;
  camera_off_on_join?: boolean;
  use_metered?: boolean;
}

interface Meeting {
  id: string;
  slug: string;
  title: string;
  host_id: string;
  co_host_id: string | null;
  status: string;
  is_locked: boolean;
  max_participants: number | null;
  access_code?: string | null;
  settings: MeetingSettings;
}

interface Props {
  meeting: Meeting;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string | null;
}

interface Toast {
  id: string;
  message: string;
  type: "info" | "warning";
}

interface PendingJoinRequest {
  id: string;
  user_id: string;
  created_at: string;
  profiles?: { full_name?: string | null; avatar_url?: string | null } | null;
}

/* ---- Helpers ---- */

function QualityIndicator({ quality }: { quality: ConnectionQuality }) {
  const config: Record<ConnectionQuality, { color: string; bg: string; label: string; bars: number }> = {
    excellent: { color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Excelente", bars: 4 },
    good: { color: "text-green-400", bg: "bg-green-500/10", label: "Buena", bars: 3 },
    fair: { color: "text-amber-400", bg: "bg-amber-500/10", label: "Regular", bars: 2 },
    poor: { color: "text-red-400", bg: "bg-red-500/10", label: "Mala", bars: 1 },
    unknown: { color: "text-gray-500", bg: "bg-white/5", label: "...", bars: 0 },
  };
  const c = config[quality];
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${c.bg} backdrop-blur-sm transition-all duration-300`} title={`Conexión: ${c.label}`}>
      <div className="flex items-end gap-[2px] h-3">
        {[1, 2, 3, 4].map((bar) => (
          <div key={bar} className={`w-[3px] rounded-full transition-all duration-300 ${
            bar <= c.bars ? c.color.replace('text-', 'bg-') : 'bg-white/10'
          }`} style={{ height: `${bar * 25}%` }} />
        ))}
      </div>
      <span className={`text-[10px] font-medium hidden sm:inline ${c.color}`}>{c.label}</span>
    </div>
  );
}

function CallTimer({ startTime }: { startTime: number | null }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startTime) return;
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [startTime]);
  if (!startTime) return null;
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  const h = Math.floor(m / 60);
  const mm = h > 0 ? m % 60 : m;
  const timeStr = h > 0
    ? `${h}:${String(mm).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${mm}:${String(s).padStart(2, "0")}`;
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 backdrop-blur-sm">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
      <span className="text-xs text-gray-300 font-mono tabular-nums">{timeStr}</span>
    </div>
  );
}

function ToastNotification({ toasts }: { toasts: Toast[] }) {
  if (!toasts.length) return null;
  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm font-medium shadow-2xl backdrop-blur-xl animate-fade-in-down ${
            t.type === "warning"
              ? "bg-gradient-to-r from-amber-500/20 to-orange-500/15 border border-amber-500/25 text-amber-200"
              : "bg-gradient-to-r from-white/10 to-white/5 border border-white/15 text-white"
          }`}
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${
            t.type === "warning" ? "bg-amber-400" : "bg-cyan-400"
          }`} />
          {t.message}
        </div>
      ))}
    </div>
  );
}

/* ---- Main Component ---- */

export default function VideoRoomClient({ meeting, currentUserId, currentUserName, currentUserAvatar }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const isHost = meeting.host_id === currentUserId;
  const isCoHost = meeting.co_host_id === currentUserId;
  const canManage = isHost || isCoHost;

  const settings = meeting.settings || {};
  const allowChat = settings.allow_chat !== false;
  const allowScreenShare = settings.allow_screen_share !== false;
  const allowHandRaise = settings.allow_hand_raise !== false;
  const allowAnnotations = settings.allow_annotations !== false;
  const useMetered = settings.use_metered === true;

  /* ---- Metered TURN credentials ---- */
  const [turnServers, setTurnServers] = useState<RTCIceServer[]>([]);
  const [turnFetched, setTurnFetched] = useState(false);

  useEffect(() => {
    if (!useMetered) {
      setTurnFetched(true);
      return;
    }
    fetch("/api/meetings/turn-credentials")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.iceServers) setTurnServers(data.iceServers);
        setTurnFetched(true);
      })
      .catch(() => {
        setTurnFetched(true);
      });
  }, [useMetered]);

  /* ---- WebRTC ---- */
  const {
    status, error, localStream, remoteStream,
    micEnabled, camEnabled,
    isScreenSharing, connectionQuality,
    start, retry, toggleMic, toggleCam,
    shareScreen, stopScreenShare, destroy,
  } = useWebRTC({
    roomId: meeting.id,
    userId: currentUserId,
    isInitiator: isHost,
    extraIceServers: turnServers.length > 0 ? turnServers : undefined,
  });

  /* ---- Reactions / Hand Raise ---- */
  const {
    floating, handRaisedUsers, myHandRaised,
    sendReaction, toggleHandRaise, clearUserHandRaise, REACTION_EMOJIS,
  } = useReactions({ meetingId: meeting.id, currentUserId, currentUserName });

  /* ---- UI State ---- */
  const [showChat, setShowChat] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showScreenShareMenu, setShowScreenShareMenu] = useState(false);
  const [annotationMode, setAnnotationMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLocked, setIsLocked] = useState(meeting.is_locked);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingJoinRequest[]>([]);
  const [managingRequestId, setManagingRequestId] = useState<string | null>(null);
  const [peerLeft, setPeerLeft] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirectCall = meeting.is_locked && meeting.settings?.mute_on_join === undefined;

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const outboundRingRef = useRef<{ stop: () => void } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* ---- Detect mobile ---- */
  const isMobile = typeof navigator !== "undefined" && /Mobi|Android/i.test(navigator.userAgent);

  /* ---- Toast helper ---- */
  const addToast = useCallback((message: string, type: "info" | "warning" = "info") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  /* ---- Auto-hide controls on mobile ---- */
  const resetControlsTimer = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    if (isMobile) {
      controlsTimerRef.current = setTimeout(() => setControlsVisible(false), 5000);
    }
  }, [isMobile]);

  /* ---- Register participant ---- */
  useEffect(() => {
    // Clear left_at on join (handles rejoin case)
    supabase.from("meeting_participants").upsert({
      meeting_id: meeting.id,
      user_id: currentUserId,
      role: isHost ? "host" : isCoHost ? "co_host" : "participant",
      left_at: null,
    }, { onConflict: "meeting_id,user_id" });

    if (isHost && meeting.status === "planned") {
      supabase.from("meetings").update({
        status: "active",
        started_at: new Date().toISOString(),
      }).eq("id", meeting.id);
    }

    return () => {
      supabase.from("meeting_participants").update({
        left_at: new Date().toISOString(),
      }).eq("meeting_id", meeting.id).eq("user_id", currentUserId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- Listen for participants joining/leaving ---- */
  useEffect(() => {
    const channel = supabase
      .channel(`meeting-participants-${meeting.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "meeting_participants",
          filter: `meeting_id=eq.${meeting.id}`,
        },
        async (payload) => {
          const updated = payload.new as { user_id: string; left_at: string | null };
          if (updated.user_id === currentUserId) return;

          if (updated.left_at) {
            // Participant LEFT
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", updated.user_id)
              .single();
            const name = profile?.full_name || "Un participante";
            addToast(`${name} salió de la sesión`, "warning");
            playLeaveSound();
            setPeerLeft(true);

            // Clear their hand raise
            clearUserHandRaise(updated.user_id);

            // For direct calls (2-person locked meetings), auto-end after 15s
            if (meeting.is_locked && meeting.max_participants === 2 && isHost) {
              if (autoEndTimerRef.current) clearTimeout(autoEndTimerRef.current);
              autoEndTimerRef.current = setTimeout(async () => {
                destroy();
                await endMeeting(meeting.id);
                router.push("/admin/reuniones");
              }, 15_000);
            }
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "meeting_participants",
          filter: `meeting_id=eq.${meeting.id}`,
        },
        async (payload) => {
          const inserted = payload.new as { user_id: string };
          if (inserted.user_id === currentUserId) return;

          // New participant joined — reset peerLeft, cancel auto-end
          setPeerLeft(false);
          if (autoEndTimerRef.current) {
            clearTimeout(autoEndTimerRef.current);
            autoEndTimerRef.current = null;
          }

          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", inserted.user_id)
            .single();
          const name = profile?.full_name || "Un participante";
          addToast(`${name} se unió a la sesión`, "info");
          playJoinSound();
        },
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting.id, currentUserId, addToast, clearUserHandRaise]);

  /* ---- Start call ---- */
  const turnReady = !useMetered || turnFetched;

  useEffect(() => {
    if (!turnReady) return;
    const withVideo = settings.camera_off_on_join !== true;
    const muteOnJoin = settings.mute_on_join === true;
    const run = async () => {
      if (isHost) {
        await resetMeetingSignals(meeting.id);
      }
      await start({ withVideo, muteOnStart: muteOnJoin });
    };
    void run();
    return () => {
      if (autoEndTimerRef.current) clearTimeout(autoEndTimerRef.current);
      destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnReady]);

  useEffect(() => {
    if (!canManage) return;
    let active = true;

    const loadPending = async () => {
      const res = await listPendingJoinApprovals(meeting.id);
      if (!active) return;
      if (!res.error) setPendingRequests((res.requests as PendingJoinRequest[] | undefined) ?? []);
    };

    void loadPending();
    const timer = setInterval(loadPending, 4000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [canManage, meeting.id]);

  const handleRequestDecision = useCallback(async (userId: string, accept: boolean) => {
    setManagingRequestId(userId);
    const res = await respondJoinApproval(meeting.id, userId, accept);
    setManagingRequestId(null);
    if (res.error) {
      addToast(res.error, "warning");
      return;
    }
    setPendingRequests((prev) => prev.filter((r) => r.user_id !== userId));
    addToast(accept ? "Participante aceptado" : "Solicitud rechazada", "info");
  }, [meeting.id, addToast]);

  /* ---- Outbound ring ---- */
  useEffect(() => {
    if (status === "connecting" && isHost) {
      outboundRingRef.current = playOutgoingRing();
    } else {
      outboundRingRef.current?.stop();
      outboundRingRef.current = null;
    }
    return () => { outboundRingRef.current?.stop(); };
  }, [status, isHost]);

  /* ---- Connected / ended sounds ---- */
  useEffect(() => {
    if (status === "connected") {
      playJoinSound();
      setCallStartTime(Date.now());
      setPeerLeft(false);
      // Clear auto-end timer if peer reconnected
      if (autoEndTimerRef.current) { clearTimeout(autoEndTimerRef.current); autoEndTimerRef.current = null; }
    }
    if (status === "ended") {
      playCallEndSound();
      const t = window.setTimeout(() => router.push("/admin/reuniones"), 2000);
      return () => window.clearTimeout(t);
    }
  }, [status, router]);

  /* ---- Attach streams ---- */
  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  /* ---- Chat unread counter ---- */
  useEffect(() => {
    if (!allowChat) return;
    const channel = supabase
      .channel(`meeting-unread-${meeting.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "meeting_messages", filter: `meeting_id=eq.${meeting.id}` },
        (payload) => {
          const msg = payload.new as { sender_id: string; message_type: string };
          if (msg.sender_id !== currentUserId && !showChat && msg.message_type === "text") {
            setUnreadMessages((prev) => prev + 1);
          }
        },
      )
      .subscribe();
    return () => { channel.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting.id, currentUserId, showChat, allowChat]);

  /* ---- Handlers ---- */
  const handleLeave = useCallback(async () => {
    if (autoEndTimerRef.current) clearTimeout(autoEndTimerRef.current);
    // Lower hand if raised, so other participants see it cleared
    if (myHandRaised) toggleHandRaise();
    playLeaveSound();
    destroy();
    // For direct calls, auto-end the meeting when leaving
    if (meeting.is_locked && meeting.max_participants === 2 && isHost) {
      await endMeeting(meeting.id);
    }
    router.push("/admin/reuniones");
  }, [destroy, router, meeting.id, meeting.is_locked, meeting.max_participants, isHost, myHandRaised, toggleHandRaise]);

  const handleClose = useCallback(async () => {
    if (!confirm("¿Cerrar la sala para todos?")) return;
    if (myHandRaised) toggleHandRaise();
    playCallEndSound();
    destroy();
    await endMeeting(meeting.id);
    router.push("/admin/reuniones");
  }, [destroy, meeting.id, router, myHandRaised, toggleHandRaise]);

  const handleToggleLock = useCallback(async () => {
    const next = !isLocked;
    setIsLocked(next);
    await toggleMeetingLock(meeting.id, next);
  }, [isLocked, meeting.id]);

  const handleScreenShare = useCallback(async (withAudio: boolean) => {
    setShowScreenShareMenu(false);
    playScreenShareSound();
    await shareScreen(withAudio);
  }, [shareScreen]);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const handleOpenChat = useCallback(() => {
    setShowChat(true);
    setUnreadMessages(0);
    setShowMore(false);
  }, []);

  /* ---- Keyboard shortcuts ---- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key.toLowerCase()) {
        case "m": toggleMic(); break;
        case "v": toggleCam(); break;
        case "f": handleToggleFullscreen(); break;
        case "escape":
          setShowChat(false);
          setShowMore(false);
          setShowReactions(false);
          setShowScreenShareMenu(false);
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleMic, toggleCam, handleToggleFullscreen]);

  /* ---- Status labels ---- */
  const statusLabel: Record<string, string> = {
    idle: "Iniciando...",
    requesting_media: "Accediendo a cámara y micrófono...",
    connecting: "Conectando con el otro participante...",
    connected: "",
    ended: "Llamada finalizada",
    error: "No se pudo establecer la conexión",
  };

  const hasRemoteVideo = remoteStream && remoteStream.getVideoTracks().some((t) => t.enabled && t.readyState === "live");
  // peerDisconnected only when they explicitly left — NOT when camera is off
  const peerDisconnected = peerLeft;

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col h-[100dvh] sm:h-[calc(100vh-5rem)] sm:-m-8 -m-4 bg-[#030712] overflow-hidden select-none"
      onClick={resetControlsTimer}
      onTouchStart={resetControlsTimer}
    >
      {/* ===== Toast notifications ===== */}
      <ToastNotification toasts={toasts} />

      {/* ===== Main content: video area + chat side ===== */}
      <div className="relative flex flex-1 min-h-0">
        {/* ===== Video area ===== */}
        <div className="relative flex-1 min-w-0">
          {/* Remote video — ALWAYS render when connected (critical for audio playback) */}
          {status === "connected" && (
            <>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`absolute inset-0 w-full h-full object-contain bg-black transition-opacity duration-300 ${
                  hasRemoteVideo && !peerDisconnected ? "opacity-100" : "opacity-0"
                }`}
              />

              {/* Peer left overlay */}
              {peerDisconnected && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#030712] z-[1]">
                  <div className="relative animate-fade-in-scale">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 flex items-center justify-center mb-5">
                      <span className="text-4xl sm:text-5xl text-gray-500">👤</span>
                    </div>
                    <div className="absolute -inset-2 rounded-3xl border border-white/5 animate-pulse" />
                  </div>
                  <p className="text-gray-300 text-sm font-medium animate-fade-in">El participante salió de la sesión</p>
                  {meeting.is_locked && meeting.max_participants === 2 ? (
                    <>
                      <p className="text-gray-500 text-xs mt-2 animate-fade-in">La sala se cerrará automáticamente en unos segundos</p>
                      <button
                        onClick={async () => {
                          if (autoEndTimerRef.current) clearTimeout(autoEndTimerRef.current);
                          destroy();
                          if (isHost) await endMeeting(meeting.id);
                          router.push("/admin/reuniones");
                        }}
                        className="btn-premium mt-5 px-6 py-2.5 rounded-2xl bg-red-500/15 text-red-400 text-sm font-semibold hover:bg-red-500/25 border border-red-500/25 transition-all active:scale-95 animate-fade-in-up"
                      >
                        Terminar llamada ahora
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 mt-3 animate-fade-in">
                      <div className="dot-loading text-gray-500"><span /><span /><span /></div>
                      <p className="text-gray-500 text-xs">Esperando reconexión</p>
                    </div>
                  )}
                </div>
              )}

              {/* Remote camera off overlay (peer is here but camera off) */}
              {!peerDisconnected && !hasRemoteVideo && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#030712] z-[1]">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 flex items-center justify-center">
                    <CameraOff size={36} className="text-gray-500" />
                  </div>
                  <p className="text-gray-400 text-sm mt-4 font-medium">Cámara desactivada</p>
                </div>
              )}
            </>
          )}

          {/* Screen annotation overlay */}
          {annotationMode && allowAnnotations && (
            <ScreenAnnotation
              meetingId={meeting.id}
              userId={currentUserId}
              enabled={annotationMode}
              onClose={() => setAnnotationMode(false)}
            />
          )}

          {/* Floating reactions */}
          <FloatingReactions reactions={floating} />

          {/* Hand raise banner */}
          <HandRaiseBanner users={handRaisedUsers} />

          {/* Waiting / connecting overlay */}
          {status !== "connected" && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#030712]/95 gap-4 px-4">
              {/* Decorative orbs */}
              <div className="meeting-orb w-80 h-80 bg-cyan-500/5 top-10 -right-20" />
              <div className="meeting-orb w-60 h-60 bg-blue-500/4 -bottom-10 -left-10" style={{ animationDelay: "-8s" }} />

              {status === "error" || status === "ended" ? (
                <div className="animate-fade-in-up text-center">
                  <div className={`mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center mb-5 ${
                    status === "ended"
                      ? "bg-gradient-to-br from-amber-500/15 to-orange-500/10 border border-amber-500/20"
                      : "bg-gradient-to-br from-red-500/15 to-red-600/10 border border-red-500/20"
                  }`}>
                    {status === "ended"
                      ? <PhoneOff className="text-amber-400" size={32} />
                      : <WifiOff className="text-red-400" size={32} />
                    }
                  </div>
                  <p className={`text-lg sm:text-xl font-bold mb-2 ${status === "ended" ? "text-amber-200" : "text-red-300"}`}>
                    {status === "ended" ? "Llamada terminada" : "Error de conexión"}
                  </p>
                  <p className="text-gray-400 text-sm text-center max-w-xs mx-auto mb-6">{error || statusLabel[status]}</p>
                  <div className="flex gap-3 justify-center">
                    {status === "error" && (
                      <button
                        onClick={retry}
                        className="btn-premium px-6 py-2.5 rounded-2xl bg-cyan-500/15 text-cyan-300 text-sm hover:bg-cyan-500/25 border border-cyan-500/25 transition-all active:scale-95"
                      >
                        Reintentar
                      </button>
                    )}
                    <button
                      onClick={() => router.push("/admin/reuniones")}
                      className="btn-premium px-6 py-2.5 rounded-2xl bg-white/5 text-gray-300 text-sm hover:bg-white/10 border border-white/10 transition-all active:scale-95"
                    >
                      Volver a reuniones
                    </button>
                  </div>
                </div>
              ) : (
                <div className="animate-fade-in-up text-center">
                  <div className="relative mx-auto mb-5">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/15 flex items-center justify-center overflow-hidden">
                      {currentUserAvatar ? (
                        <img src={currentUserAvatar} alt="" className="w-full h-full rounded-3xl object-cover" />
                      ) : (
                        <span className="text-2xl sm:text-3xl font-bold text-white/80">{currentUserName[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    {/* Spinning ring */}
                    <div className="absolute -inset-1 rounded-3xl border-2 border-cyan-400/20 border-t-cyan-400/60 animate-spin" style={{ animationDuration: "1.5s" }} />
                    {/* Outer pulsing ring */}
                    <div className="absolute -inset-3 rounded-3xl border border-cyan-500/10" style={{ animation: "ripple 2.5s ease-out infinite" }} />
                  </div>
                  <p className="text-white text-sm font-medium mb-1">{statusLabel[status]}</p>
                  <p className="text-gray-500 text-xs mb-4">{meeting.title}</p>
                  {status === "connecting" && (
                    <div className="flex items-center justify-center gap-2">
                      <div className="dot-loading text-cyan-400"><span /><span /><span /></div>
                      <span className="text-[10px] text-gray-500">Esperando respuesta</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ===== Top bar ===== */}
          <div className={`absolute top-0 inset-x-0 z-20 flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 transition-all duration-500 ${
            controlsVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
          }`}>
            {/* Frosted glass bar */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-transparent backdrop-blur-sm" />
            
            <div className="relative flex items-center gap-2.5 min-w-0 flex-1">
              <h2 className="text-xs sm:text-sm font-semibold text-white drop-shadow truncate max-w-[140px] sm:max-w-none">{meeting.title}</h2>
              {isHost && (
                <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/15 shrink-0 backdrop-blur-sm">
                  <Crown size={10} /> Anfitrión
                </span>
              )}
              {isLocked && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-red-300 bg-red-500/10 border border-red-500/15 shrink-0">
                  <Lock size={8} />
                  <span className="hidden sm:inline">Privada</span>
                </span>
              )}
              {useMetered && turnServers.length > 0 && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-blue-300 bg-blue-500/10 border border-blue-500/15 shrink-0">
                  <Globe size={8} />
                  <span className="hidden sm:inline">Metered</span>
                </span>
              )}
              {status === "connected" && meeting.access_code && (
                <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold text-amber-200 bg-amber-500/10 border border-amber-500/15 shrink-0">
                  Código: {meeting.access_code}
                </span>
              )}
            </div>
            <div className="relative flex items-center gap-2 sm:gap-3 shrink-0">
              <CallTimer startTime={callStartTime} />
              {status === "connected" && <QualityIndicator quality={connectionQuality} />}
              {status === "connected" && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 backdrop-blur-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" />
                  <span className="hidden sm:inline text-[10px] text-emerald-300 font-medium">En vivo</span>
                </div>
              )}
            </div>
          </div>

          {canManage && pendingRequests.length > 0 && (
            <div className="absolute left-3 right-3 sm:left-4 sm:right-auto sm:w-[380px] top-16 z-20 glass-card rounded-2xl p-3 animate-fade-in-down">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <p className="text-xs text-amber-200 font-semibold">Solicitudes para entrar</p>
                <span className="ml-auto text-[10px] text-gray-500">{pendingRequests.length}</span>
              </div>
              <div className="space-y-2 max-h-44 overflow-auto pr-1 meeting-scrollbar">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 transition-all hover:bg-white/[0.04]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-xs font-bold text-white border border-white/10 shrink-0">
                        {(req.profiles?.full_name || "P")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-white truncate">{req.profiles?.full_name || "Participante"}</p>
                        <p className="text-[10px] text-gray-500">{new Date(req.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleRequestDecision(req.user_id, true)}
                        disabled={managingRequestId === req.user_id}
                        className="btn-premium px-3 py-1.5 rounded-lg text-[10px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/20 hover:bg-emerald-500/25 disabled:opacity-50 transition-all active:scale-95"
                      >
                        Aceptar
                      </button>
                      <button
                        onClick={() => handleRequestDecision(req.user_id, false)}
                        disabled={managingRequestId === req.user_id}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-semibold text-red-300 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50 transition-all active:scale-95"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== Local PiP ===== */}
          <div className={`absolute z-20 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 transition-all duration-500 group ${
            controlsVisible ? "opacity-100" : "opacity-70 hover:opacity-100"
          } ${isMobile ? "bottom-20 right-2 w-24" : showChat ? "bottom-20 right-3 w-28 lg:w-36" : "bottom-20 right-3 w-32 sm:w-40 lg:w-48"
          } aspect-video`}>
            {/* Gradient border glow */}
            <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-cyan-500/30 via-transparent to-blue-500/20 opacity-60 transition-opacity group-hover:opacity-100" />
            <div className="absolute inset-0 rounded-2xl overflow-hidden bg-gray-900">
              {localStream ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${!camEnabled ? "hidden" : ""} ${isScreenSharing ? "opacity-60" : ""}`}
                />
              ) : null}
              {(!localStream || !camEnabled) && (
                <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                  {currentUserAvatar ? (
                    <img src={currentUserAvatar} alt="" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-white/10" />
                  ) : (
                    <span className="text-lg sm:text-2xl font-bold text-white/80">{currentUserName[0]?.toUpperCase()}</span>
                  )}
                </div>
              )}
              {/* Status indicators */}
              <div className="absolute bottom-1.5 left-1.5 flex gap-1">
                {!micEnabled && (
                  <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-red-500/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
                    <MicOff size={10} className="text-white" />
                  </span>
                )}
                {!camEnabled && (
                  <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-red-500/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
                    <CameraOff size={10} className="text-white" />
                  </span>
                )}
              </div>
              {isScreenSharing && (
                <div className="absolute top-1 right-1">
                  <span className="px-1.5 py-0.5 rounded-md text-[7px] font-bold bg-green-500/90 text-white leading-none shadow-lg">Pantalla</span>
                </div>
              )}
              {myHandRaised && (
                <div className="absolute top-1 left-1">
                  <span className="text-sm animate-bounce">✋</span>
                </div>
              )}
            </div>
          </div>

          {/* ===== Bottom controls ===== */}
          <div className={`absolute bottom-0 inset-x-0 z-20 transition-all duration-500 ${
            controlsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none"
          }`}>
            {/* Frosted bottom gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent backdrop-blur-[2px]" />

            <div className="relative flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-5 max-w-2xl mx-auto flex-wrap">
              {/* Mic */}
              <button
                onClick={toggleMic}
                title={micEnabled ? "Silenciar (M)" : "Activar micrófono (M)"}
                className={`group relative flex items-center justify-center w-11 h-11 sm:w-13 sm:h-13 rounded-2xl transition-all duration-200 active:scale-90 ${
                  micEnabled
                    ? "bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm"
                    : "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30"
                }`}
              >
                {micEnabled ? <Mic size={isMobile ? 16 : 20} /> : <MicOff size={isMobile ? 16 : 20} />}
                <span className="absolute -bottom-5 text-[9px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden sm:block">
                  {micEnabled ? "Silenciar" : "Activar"}
                </span>
              </button>

              {/* Camera */}
              <button
                onClick={toggleCam}
                title={camEnabled ? "Apagar cámara (V)" : "Encender cámara (V)"}
                className={`group relative flex items-center justify-center w-11 h-11 sm:w-13 sm:h-13 rounded-2xl transition-all duration-200 active:scale-90 ${
                  camEnabled
                    ? "bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm"
                    : "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30"
                }`}
              >
                {camEnabled ? <Camera size={isMobile ? 16 : 20} /> : <CameraOff size={isMobile ? 16 : 20} />}
                <span className="absolute -bottom-5 text-[9px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden sm:block">
                  {camEnabled ? "Cámara" : "Encender"}
                </span>
              </button>

              {/* Screen share (desktop only) */}
              {allowScreenShare && !isMobile && (
                <div className="relative">
                  {isScreenSharing ? (
                    <button
                      onClick={() => { stopScreenShare(); playScreenShareSound(); }}
                      title="Dejar de compartir"
                      className="group relative flex items-center justify-center w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-green-500 text-white hover:bg-green-600 transition-all duration-200 active:scale-90 shadow-lg shadow-green-500/30 animate-pulse"
                    >
                      <MonitorOff size={20} />
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowScreenShareMenu(!showScreenShareMenu)}
                      title="Compartir pantalla"
                      className="group relative flex items-center justify-center w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm transition-all duration-200 active:scale-90"
                    >
                      <MonitorUp size={20} />
                      <span className="absolute -bottom-5 text-[9px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden sm:block">Compartir</span>
                    </button>
                  )}
                  {showScreenShareMenu && !isScreenSharing && (
                    <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 glass-card rounded-2xl p-2 shadow-2xl min-w-[200px] z-50 animate-fade-in-scale">
                      <button
                        onClick={() => handleScreenShare(false)}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs text-white hover:bg-white/10 transition-all"
                      >
                        <MonitorUp size={15} className="text-cyan-400" /> Compartir pantalla
                      </button>
                      <button
                        onClick={() => handleScreenShare(true)}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs text-white hover:bg-white/10 transition-all"
                      >
                        <Volume2 size={15} className="text-purple-400" /> Pantalla con audio
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Hand raise */}
              {allowHandRaise && (
                <button
                  onClick={toggleHandRaise}
                  title={myHandRaised ? "Bajar la mano" : "Levantar la mano"}
                  className={`group relative flex items-center justify-center w-11 h-11 sm:w-13 sm:h-13 rounded-2xl transition-all duration-200 active:scale-90 ${
                    myHandRaised
                      ? "bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/30 scale-105"
                      : "bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm"
                  }`}
                >
                  <Hand size={isMobile ? 16 : 20} />
                </button>
              )}

              {/* Reactions */}
              <div className="relative">
                <button
                  onClick={() => { setShowReactions(!showReactions); setShowMore(false); setShowScreenShareMenu(false); }}
                  title="Reacciones"
                  className="group relative flex items-center justify-center w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm transition-all duration-200 active:scale-90"
                >
                  <Smile size={isMobile ? 16 : 20} />
                </button>
                {showReactions && (
                  <ReactionPicker
                    emojis={REACTION_EMOJIS}
                    onSelect={sendReaction}
                    onClose={() => setShowReactions(false)}
                  />
                )}
              </div>

              {/* Chat */}
              {allowChat && (
                <button
                  onClick={handleOpenChat}
                  title="Chat"
                  className={`group relative flex items-center justify-center w-11 h-11 sm:w-13 sm:h-13 rounded-2xl transition-all duration-200 active:scale-90 ${
                    showChat
                      ? "bg-cyan-500/25 text-cyan-300 hover:bg-cyan-500/35 ring-1 ring-cyan-500/30"
                      : "bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm"
                  }`}
                >
                  <MessageCircle size={isMobile ? 16 : 20} />
                  {unreadMessages > 0 && !showChat && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-red-500 text-white text-[9px] sm:text-[10px] font-bold flex items-center justify-center shadow-lg shadow-red-500/50 animate-bounce">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  )}
                </button>
              )}

              {/* More options */}
              <div className="relative">
                <button
                  onClick={() => { setShowMore(!showMore); setShowReactions(false); setShowScreenShareMenu(false); }}
                  title="Más opciones"
                  className={`group relative flex items-center justify-center w-11 h-11 sm:w-13 sm:h-13 rounded-2xl transition-all duration-200 active:scale-90 ${
                    showMore ? "bg-white/20 text-white" : "bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm"
                  }`}
                >
                  <MoreHorizontal size={isMobile ? 16 : 20} />
                </button>
                {showMore && (
                  <div className={`absolute bottom-full mb-3 glass-card rounded-2xl p-1.5 shadow-2xl min-w-[220px] z-50 animate-fade-in-scale ${
                    isMobile ? "right-0" : "right-0"
                  }`}>
                    {allowAnnotations && canManage && !isMobile && (
                      <button
                        onClick={() => { setAnnotationMode(!annotationMode); setShowMore(false); }}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs text-white hover:bg-white/10 transition-all"
                      >
                        <Pencil size={15} className={annotationMode ? "text-cyan-400" : "text-gray-400"} />
                        {annotationMode ? "Cerrar anotaciones" : "Anotar en pantalla"}
                      </button>
                    )}
                    {canManage && (
                      <button
                        onClick={() => { handleToggleLock(); setShowMore(false); }}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs text-white hover:bg-white/10 transition-all"
                      >
                        {isLocked ? <Unlock size={15} className="text-green-400" /> : <Lock size={15} className="text-red-400" />}
                        {isLocked ? "Desbloquear sala" : "Bloquear sala"}
                      </button>
                    )}
                    <button
                      onClick={() => { handleToggleFullscreen(); setShowMore(false); }}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs text-white hover:bg-white/10 transition-all"
                    >
                      {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
                      {isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                    </button>
                  </div>
                )}
              </div>

              {/* Separator */}
              <div className="w-px h-8 sm:h-9 bg-white/10 mx-0.5 sm:mx-1 hidden sm:block" />

              {/* Leave */}
              <button
                onClick={handleLeave}
                title="Salir de la reunión"
                className="group relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-red-600 text-white hover:bg-red-500 transition-all duration-200 shadow-xl shadow-red-600/30 active:scale-90"
              >
                <PhoneOff size={isMobile ? 18 : 22} />
              </button>

              {/* Host: close for all */}
              {isHost && (
                <button
                  onClick={handleClose}
                  title="Cerrar sala para todos"
                  className="group relative flex items-center justify-center w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-amber-500/15 text-amber-300 hover:bg-amber-500/30 border border-amber-500/20 transition-all duration-200 active:scale-90"
                >
                  <Crown size={isMobile ? 14 : 16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ===== Chat side panel (retractable) ===== */}
        {allowChat && showChat && (
          <div className={`${
            isMobile
              ? "fixed inset-x-0 bottom-0 z-50 h-[65dvh] rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
              : "relative w-72 lg:w-80 shrink-0 border-l border-white/[0.06]"
          } bg-gradient-to-b from-[#0c1220] to-[#080d18] flex flex-col ${
            isMobile ? "animate-slide-in-up" : "animate-slide-in-right"
          }`}>
            {/* Chat header with close button */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
              <span className="text-xs font-semibold text-white flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <MessageCircle size={12} className="text-cyan-400" />
                </div>
                Chat de la reunión
              </span>
              <button
                onClick={() => setShowChat(false)}
                className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-90"
              >
                {isMobile ? <ChevronDown size={14} /> : <X size={14} />}
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <MeetingChat
                meetingId={meeting.id}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                onClose={() => setShowChat(false)}
                visible={showChat}
              />
            </div>
          </div>
        )}
      </div>

      {/* Close menus on click outside */}
      {(showReactions || showMore || showScreenShareMenu) && (
        <div
          className="fixed inset-0 z-[19]"
          onClick={() => { setShowReactions(false); setShowMore(false); setShowScreenShareMenu(false); }}
        />
      )}
    </div>
  );
}