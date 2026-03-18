"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Camera, CameraOff, PhoneOff, Crown } from "lucide-react";
import { useWebRTC } from "@/hooks/useWebRTC";
import { endMeeting } from "../../actions";

interface Meeting {
  id: string;
  slug: string;
  title: string;
  host_id: string;
  status: string;
}

interface Props {
  meeting: Meeting;
  currentUserId: string;
  currentUserName: string;
}

export default function VideoRoomClient({ meeting, currentUserId, currentUserName }: Props) {
  const router = useRouter();
  const isHost = meeting.host_id === currentUserId;

  const { status, error, localStream, remoteStream, micEnabled, camEnabled, start, toggleMic, toggleCam, destroy } =
    useWebRTC({ roomId: meeting.id, userId: currentUserId, isInitiator: isHost });

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Start WebRTC media capture on mount
  useEffect(() => {
    start(true);
    return () => { destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Attach streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  async function handleLeave() {
    destroy();
    router.push("/admin/reuniones");
  }

  async function handleClose() {
    if (!confirm("¿Cerrar la sala para todos?")) return;
    destroy();
    await endMeeting(meeting.id);
    router.push("/admin/reuniones");
  }

  const statusLabel: Record<string, string> = {
    idle: "Iniciando...",
    requesting_media: "Accediendo a cámara y micrófono...",
    connecting: "Conectando con el otro participante...",
    connected: "",
    error: "",
  };

  return (
    <div className="relative flex flex-col h-[calc(100vh-5rem)] -m-4 md:-m-8 bg-[#030712] overflow-hidden">
      {/* Remote video — full screen */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Waiting / connecting overlay */}
      {status !== "connected" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#030712]/90 gap-4">
          {status === "error" ? (
            <>
              <p className="text-red-400 text-lg font-semibold">Error de conexión</p>
              <p className="text-gray-400 text-sm text-center max-w-xs">{error}</p>
              <button
                onClick={() => router.push("/admin/reuniones")}
                className="mt-2 px-5 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
              >
                Volver
              </button>
            </>
          ) : (
            <>
              <div className="w-14 h-14 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
              <p className="text-white text-sm font-medium">{statusLabel[status]}</p>
              <p className="text-gray-500 text-xs">{meeting.title}</p>
            </>
          )}
        </div>
      )}

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-white drop-shadow">{meeting.title}</h2>
          {isHost && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20">
              <Crown size={10} /> Anfitrión
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {status === "connected" && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              En vivo
            </span>
          )}
        </div>
      </div>

      {/* Local PiP — bottom-right */}
      <div className="absolute bottom-24 right-4 z-20 w-36 aspect-video rounded-xl overflow-hidden border border-white/20 shadow-lg bg-gray-900">
        {localStream ? (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl font-bold text-white">{currentUserName[0]?.toUpperCase()}</span>
          </div>
        )}
        {!micEnabled && (
          <div className="absolute bottom-1 left-1">
            <MicOff size={12} className="text-red-400" />
          </div>
        )}
      </div>

      {/* Bottom controls bar */}
      <div className="absolute bottom-0 inset-x-0 z-20 flex items-center justify-center gap-3 px-4 py-4 bg-gradient-to-t from-black/80 to-transparent">
        {/* Mic toggle */}
        <button
          onClick={toggleMic}
          title={micEnabled ? "Silenciar" : "Activar micrófono"}
          className={`flex items-center justify-center w-12 h-12 rounded-full transition-colors ${
            micEnabled ? "bg-white/15 text-white hover:bg-white/25" : "bg-red-500/80 text-white hover:bg-red-600/80"
          }`}
        >
          {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
        </button>

        {/* Camera toggle */}
        <button
          onClick={toggleCam}
          title={camEnabled ? "Apagar cámara" : "Encender cámara"}
          className={`flex items-center justify-center w-12 h-12 rounded-full transition-colors ${
            camEnabled ? "bg-white/15 text-white hover:bg-white/25" : "bg-red-500/80 text-white hover:bg-red-600/80"
          }`}
        >
          {camEnabled ? <Camera size={20} /> : <CameraOff size={20} />}
        </button>

        {/* Leave / hang up */}
        <button
          onClick={handleLeave}
          title="Salir de la reunión"
          className="flex items-center justify-center w-14 h-14 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors shadow-lg"
        >
          <PhoneOff size={22} />
        </button>

        {/* Host: close room */}
        {isHost && (
          <button
            onClick={handleClose}
            title="Cerrar sala para todos"
            className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 hover:bg-amber-500/40 border border-amber-500/30 transition-colors"
          >
            <Crown size={18} />
          </button>
        )}
      </div>
    </div>
  );
}