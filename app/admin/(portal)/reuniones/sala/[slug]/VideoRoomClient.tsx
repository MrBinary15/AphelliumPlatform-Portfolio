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
import { endMeeting, toggleMeetingLock } from "../../actions";
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

/* ---- Helpers ---- */

function QualityIndicator({ quality }: { quality: ConnectionQuality }) {
  const config: Record<ConnectionQuality, { color: string; label: string }> = {
    excellent: { color: "text-emerald-400", label: "Excelente" },
    good: { color: "text-green-400", label: "Buena" },
    fair: { color: "text-amber-400", label: "Regular" },
    poor: { color: "text-red-400", label: "Mala" },
    unknown: { color: "text-gray-500", label: "..." },
  };
  const c = config[quality];
  return (
    <div className={`flex items-center gap-1 ${c.color}`} title={`Conexión: ${c.label}`}>
      <Signal size={12} />
      <span className="text-[10px] font-medium hidden sm:inline">{c.label}</span>
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
  return (
    <span className="text-xs text-gray-400 font-mono tabular-nums">
      {h > 0 ? `${h}:${String(mm).padStart(2, "0")}:` : ""}{h > 0 ? String(s).padStart(2, "0") : `${mm}:${String(s).padStart(2, "0")}`}
    </span>
  );
}

function ToastNotification({ toasts }: { toasts: Toast[] }) {
  if (!toasts.length) return null;
  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium shadow-xl backdrop-blur-md animate-[slideDown_0.3s_ease-out] ${
            t.type === "warning"
              ? "bg-amber-500/20 border border-amber-500/30 text-amber-300"
              : "bg-white/10 border border-white/20 text-white"
          }`}
        >
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

  useEffect(() => {
    if (!useMetered) return;
    fetch("/api/meetings/turn-credentials")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.iceServers) setTurnServers(data.iceServers);
      })
      .catch(() => { /* fallback to STUN-only */ });
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
    sendReaction, toggleHandRaise, REACTION_EMOJIS,
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
    supabase.from("meeting_participants").upsert({
      meeting_id: meeting.id,
      user_id: currentUserId,
      role: isHost ? "host" : isCoHost ? "co_host" : "participant",
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

  /* ---- Listen for participants leaving ---- */
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
          if (updated.left_at && updated.user_id !== currentUserId) {
            // Fetch the name of the user who left
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", updated.user_id)
              .single();
            const name = profile?.full_name || "Un participante";
            addToast(`${name} salió de la sesión`, "warning");
            playLeaveSound();
            setPeerLeft(true);

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
      .subscribe();

    return () => { channel.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting.id, currentUserId, addToast]);

  /* ---- Start call ---- */
  useEffect(() => {
    const withVideo = settings.camera_off_on_join !== true;
    const muteOnJoin = settings.mute_on_join === true;
    start({ withVideo, muteOnStart: muteOnJoin });
    return () => {
      if (autoEndTimerRef.current) clearTimeout(autoEndTimerRef.current);
      destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    }
    if (status === "ended") {
      playCallEndSound();
      const t = window.setTimeout(() => router.push("/admin/reuniones"), 2000);
      return () => window.clearTimeout(t);
    }
  }, [status, router]);

  /* ---- Clear remote video when peer leaves ---- */
  useEffect(() => {
    if (!remoteStream || remoteStream.getTracks().length === 0) {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    }
  }, [remoteStream]);

  /* ---- Attach streams ---- */
  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
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
    playLeaveSound();
    destroy();
    // For direct calls, auto-end the meeting when leaving
    if (meeting.is_locked && meeting.max_participants === 2 && isHost) {
      await endMeeting(meeting.id);
    }
    router.push("/admin/reuniones");
  }, [destroy, router, meeting.id, meeting.is_locked, meeting.max_participants, isHost]);

  const handleClose = useCallback(async () => {
    if (!confirm("¿Cerrar la sala para todos?")) return;
    playCallEndSound();
    destroy();
    await endMeeting(meeting.id);
    router.push("/admin/reuniones");
  }, [destroy, meeting.id, router]);

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
    error: "",
  };

  const hasRemoteVideo = remoteStream && remoteStream.getVideoTracks().some((t) => t.enabled && t.readyState === "live");
  const peerDisconnected = peerLeft || (status === "connected" && !hasRemoteVideo);

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
          {/* Remote video — fills entire area */}
          {status === "connected" && !peerDisconnected ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-contain bg-black"
            />
          ) : status === "connected" && peerDisconnected ? (
            /* Peer left placeholder */
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#030712]">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <span className="text-3xl sm:text-4xl text-gray-600">👤</span>
              </div>
              <p className="text-gray-400 text-sm">El participante salió de la sesión</p>
              {meeting.is_locked && meeting.max_participants === 2 ? (
                <>
                  <p className="text-gray-600 text-xs mt-1">La sala se cerrará automáticamente en unos segundos</p>
                  <button
                    onClick={async () => {
                      if (autoEndTimerRef.current) clearTimeout(autoEndTimerRef.current);
                      destroy();
                      if (isHost) await endMeeting(meeting.id);
                      router.push("/admin/reuniones");
                    }}
                    className="mt-4 px-6 py-2.5 rounded-xl bg-red-500/20 text-red-400 text-sm font-semibold hover:bg-red-500/30 border border-red-500/30 transition-colors"
                  >
                    Terminar llamada ahora
                  </button>
                </>
              ) : (
                <p className="text-gray-600 text-xs mt-1">Esperando reconexión...</p>
              )}
            </div>
          ) : null}

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
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#030712]/90 gap-4 px-4">
              {status === "error" || status === "ended" ? (
                <>
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center ${
                    status === "ended" ? "bg-amber-500/20" : "bg-red-500/20"
                  }`}>
                    {status === "ended" ? <PhoneOff className="text-amber-400" size={24} /> : <WifiOff className="text-red-400" size={24} />}
                  </div>
                  <p className={`${status === "ended" ? "text-amber-300" : "text-red-400"} text-base sm:text-lg font-semibold`}>
                    {status === "ended" ? "Llamada terminada" : "Error de conexión"}
                  </p>
                  <p className="text-gray-300 text-sm text-center max-w-xs">{error || statusLabel[status]}</p>
                  <div className="flex gap-3 mt-4">
                    {status === "error" && (
                      <button
                        onClick={retry}
                        className="px-6 py-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 text-sm hover:bg-cyan-500/30 border border-cyan-500/30 transition-colors"
                      >
                        Reintentar
                      </button>
                    )}
                    <button
                      onClick={() => router.push("/admin/reuniones")}
                      className="px-6 py-2.5 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
                    >
                      Volver a reuniones
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-cyan-500/10 border-2 border-cyan-500/20 flex items-center justify-center">
                      {currentUserAvatar ? (
                        <img src={currentUserAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-2xl sm:text-3xl font-bold text-white">{currentUserName[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    <div className="absolute inset-0 w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-cyan-400/40 border-t-cyan-400 animate-spin" />
                  </div>
                  <p className="text-white text-sm font-medium mt-2">{statusLabel[status]}</p>
                  <p className="text-gray-500 text-xs">{meeting.title}</p>
                  {status === "connecting" && (
                    <div className="flex items-center gap-1 mt-2">
                      <Volume2 size={14} className="text-gray-500 animate-pulse" />
                      <span className="text-[10px] text-gray-500">Esperando respuesta...</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ===== Top bar ===== */}
          <div className={`absolute top-0 inset-x-0 z-20 flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-b from-black/70 via-black/30 to-transparent transition-opacity duration-300 ${
            controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h2 className="text-xs sm:text-sm font-semibold text-white drop-shadow truncate max-w-[140px] sm:max-w-none">{meeting.title}</h2>
              {isHost && (
                <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 shrink-0">
                  <Crown size={10} /> Anfitrión
                </span>
              )}
              {isLocked && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 shrink-0">
                  <Lock size={8} />
                  <span className="hidden sm:inline">Privada</span>
                </span>
              )}
              {useMetered && turnServers.length > 0 && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 shrink-0">
                  <Globe size={8} />
                  <span className="hidden sm:inline">Metered</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <CallTimer startTime={callStartTime} />
              {status === "connected" && <QualityIndicator quality={connectionQuality} />}
              {status === "connected" && (
                <span className="flex items-center gap-1 text-xs text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="hidden sm:inline text-[10px]">En vivo</span>
                </span>
              )}
            </div>
          </div>

          {/* ===== Local PiP ===== */}
          <div className={`absolute z-20 rounded-xl overflow-hidden border border-white/20 shadow-2xl bg-gray-900 transition-all duration-300 ${
            controlsVisible ? "opacity-100" : "opacity-80"
          } ${isMobile ? "bottom-20 right-2 w-24" : showChat ? "bottom-20 right-3 w-28 lg:w-36" : "bottom-20 right-3 w-32 sm:w-40 lg:w-48"
          } aspect-video`}>
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
              <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-800">
                {currentUserAvatar ? (
                  <img src={currentUserAvatar} alt="" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover" />
                ) : (
                  <span className="text-lg sm:text-2xl font-bold text-white">{currentUserName[0]?.toUpperCase()}</span>
                )}
              </div>
            )}
            <div className="absolute bottom-1 left-1 flex gap-0.5">
              {!micEnabled && (
                <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-red-500/80 flex items-center justify-center">
                  <MicOff size={8} className="text-white" />
                </span>
              )}
              {!camEnabled && (
                <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-red-500/80 flex items-center justify-center">
                  <CameraOff size={8} className="text-white" />
                </span>
              )}
            </div>
            {isScreenSharing && (
              <div className="absolute top-0.5 right-0.5">
                <span className="px-1 py-0.5 rounded text-[7px] font-bold bg-green-500/80 text-white leading-none">Compartiendo</span>
              </div>
            )}
            {myHandRaised && (
              <div className="absolute top-0.5 left-0.5">
                <span className="text-xs">✋</span>
              </div>
            )}
          </div>

          {/* ===== Bottom controls ===== */}
          <div className={`absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-all duration-300 ${
            controlsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
          }`}>
            <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 px-2 sm:px-3 py-3 sm:py-4 max-w-2xl mx-auto flex-wrap">
              {/* Mic */}
              <button
                onClick={toggleMic}
                title={micEnabled ? "Silenciar" : "Activar micrófono"}
                className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full transition-all ${
                  micEnabled ? "bg-white/15 text-white hover:bg-white/25" : "bg-red-500/80 text-white hover:bg-red-600/80"
                }`}
              >
                {micEnabled ? <Mic size={isMobile ? 16 : 18} /> : <MicOff size={isMobile ? 16 : 18} />}
              </button>

              {/* Camera */}
              <button
                onClick={toggleCam}
                title={camEnabled ? "Apagar cámara" : "Encender cámara"}
                className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full transition-all ${
                  camEnabled ? "bg-white/15 text-white hover:bg-white/25" : "bg-red-500/80 text-white hover:bg-red-600/80"
                }`}
              >
                {camEnabled ? <Camera size={isMobile ? 16 : 18} /> : <CameraOff size={isMobile ? 16 : 18} />}
              </button>

              {/* Screen share (desktop only) */}
              {allowScreenShare && !isMobile && (
                <div className="relative">
                  {isScreenSharing ? (
                    <button
                      onClick={() => { stopScreenShare(); playScreenShareSound(); }}
                      title="Dejar de compartir"
                      className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-500/80 text-white hover:bg-green-600/80 transition-all animate-pulse"
                    >
                      <MonitorOff size={18} />
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowScreenShareMenu(!showScreenShareMenu)}
                      title="Compartir pantalla"
                      className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/15 text-white hover:bg-white/25 transition-all"
                    >
                      <MonitorUp size={18} />
                    </button>
                  )}
                  {showScreenShareMenu && !isScreenSharing && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#0a0f1a]/95 backdrop-blur-sm border border-white/10 rounded-xl p-2 shadow-xl min-w-[180px] z-50">
                      <button
                        onClick={() => handleScreenShare(false)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white hover:bg-white/10 transition-colors"
                      >
                        <MonitorUp size={14} /> Compartir pantalla
                      </button>
                      <button
                        onClick={() => handleScreenShare(true)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white hover:bg-white/10 transition-colors"
                      >
                        <Volume2 size={14} /> Pantalla con audio
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
                  className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full transition-all ${
                    myHandRaised ? "bg-amber-500/80 text-white hover:bg-amber-600/80 scale-110" : "bg-white/15 text-white hover:bg-white/25"
                  }`}
                >
                  <Hand size={isMobile ? 16 : 18} />
                </button>
              )}

              {/* Reactions */}
              <div className="relative">
                <button
                  onClick={() => { setShowReactions(!showReactions); setShowMore(false); setShowScreenShareMenu(false); }}
                  title="Reacciones"
                  className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/15 text-white hover:bg-white/25 transition-all"
                >
                  <Smile size={isMobile ? 16 : 18} />
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
                  className={`relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full transition-all ${
                    showChat ? "bg-cyan-500/30 text-cyan-400 hover:bg-cyan-500/40" : "bg-white/15 text-white hover:bg-white/25"
                  }`}
                >
                  <MessageCircle size={isMobile ? 16 : 18} />
                  {unreadMessages > 0 && !showChat && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-red-500 text-white text-[9px] sm:text-[10px] font-bold flex items-center justify-center">
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
                  className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/15 text-white hover:bg-white/25 transition-all"
                >
                  <MoreHorizontal size={isMobile ? 16 : 18} />
                </button>
                {showMore && (
                  <div className={`absolute bottom-full mb-2 bg-[#0a0f1a]/95 backdrop-blur-sm border border-white/10 rounded-xl p-1.5 shadow-xl min-w-[200px] z-50 ${
                    isMobile ? "right-0" : "right-0"
                  }`}>
                    {allowAnnotations && canManage && !isMobile && (
                      <button
                        onClick={() => { setAnnotationMode(!annotationMode); setShowMore(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs text-white hover:bg-white/10 transition-colors"
                      >
                        <Pencil size={14} className={annotationMode ? "text-cyan-400" : ""} />
                        {annotationMode ? "Cerrar anotaciones" : "Anotar en pantalla"}
                      </button>
                    )}
                    {canManage && (
                      <button
                        onClick={() => { handleToggleLock(); setShowMore(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs text-white hover:bg-white/10 transition-colors"
                      >
                        {isLocked ? <Unlock size={14} className="text-green-400" /> : <Lock size={14} className="text-red-400" />}
                        {isLocked ? "Desbloquear sala" : "Bloquear sala"}
                      </button>
                    )}
                    <button
                      onClick={() => { handleToggleFullscreen(); setShowMore(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs text-white hover:bg-white/10 transition-colors"
                    >
                      {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
                      {isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                    </button>
                  </div>
                )}
              </div>

              {/* Separator */}
              <div className="w-px h-7 sm:h-8 bg-white/10 mx-0.5 sm:mx-1 hidden sm:block" />

              {/* Leave */}
              <button
                onClick={handleLeave}
                title="Salir de la reunión"
                className="flex items-center justify-center w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg"
              >
                <PhoneOff size={isMobile ? 18 : 20} />
              </button>

              {/* Host: close for all */}
              {isHost && (
                <button
                  onClick={handleClose}
                  title="Cerrar sala para todos"
                  className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-500/20 text-amber-400 hover:bg-amber-500/40 border border-amber-500/30 transition-all"
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
              ? "fixed inset-x-0 bottom-0 z-50 h-[65dvh] rounded-t-2xl"
              : "relative w-72 lg:w-80 shrink-0 border-l border-white/10"
          } bg-[#0a0f1a] flex flex-col animate-[slideIn_0.25s_ease-out]`}>
            {/* Chat header with close button */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0">
              <span className="text-xs font-semibold text-white flex items-center gap-2">
                <MessageCircle size={14} className="text-cyan-400" /> Chat de la reunión
              </span>
              <button
                onClick={() => setShowChat(false)}
                className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
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

      {/* Keyframe animations */}
      <style jsx global>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}