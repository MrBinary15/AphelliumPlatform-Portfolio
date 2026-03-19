"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";

/* ---------- Types ---------- */

export type RTCStatus =
  | "idle"
  | "requesting_media"
  | "connecting"
  | "connected"
  | "ended"
  | "error";

export type ConnectionQuality = "excellent" | "good" | "fair" | "poor" | "unknown";

interface UseWebRTCOptions {
  roomId: string;
  userId: string;
  isInitiator: boolean;
}

/* ---------- Config ---------- */

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
  ],
  iceCandidatePoolSize: 4,
};

const QUALITY_INTERVAL = 5_000;
const ICE_RESTART_DELAY = 3_000;

/* ---------- Hook ---------- */

export function useWebRTC({ roomId, userId, isInitiator }: UseWebRTCOptions) {
  const supabase = createClient();

  /* --- State --- */
  const [status, setStatus] = useState<RTCStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>("unknown");

  /* --- Refs --- */
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const startedRef = useRef(false);
  const manuallyClosingRef = useRef(false);
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const statsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const makingOfferRef = useRef(false);
  const channelReadyRef = useRef(false);
  const connectedOnceRef = useRef(false);
  const iceRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* --- Helpers: signaling --- */

  const pushSignal = useCallback(
    async (type: "offer" | "answer" | "candidate", payload: unknown) => {
      await supabase.from("webrtc_signals").insert({
        room_id: roomId,
        sender_id: userId,
        type,
        payload,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roomId, userId],
  );

  const drainCandidates = useCallback(async () => {
    const conn = pcRef.current;
    if (!conn) return;
    const buffered = [...pendingCandidates.current];
    pendingCandidates.current = [];
    for (const c of buffered) {
      try { await conn.addIceCandidate(new RTCIceCandidate(c)); } catch { /* stale */ }
    }
  }, []);

  const applyCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    const conn = pcRef.current;
    if (!conn) return;
    if (conn.remoteDescription) {
      try { await conn.addIceCandidate(new RTCIceCandidate(candidate)); } catch { /* stale */ }
    } else {
      pendingCandidates.current.push(candidate);
    }
  }, []);

  /* --- Perfect-negotiation offer handler (supports renegotiation) --- */

  const handleOffer = useCallback(
    async (sdp: RTCSessionDescriptionInit) => {
      const conn = pcRef.current;
      if (!conn) return;

      const isPolite = !isInitiator;
      const offerCollision =
        makingOfferRef.current || conn.signalingState !== "stable";

      if (offerCollision && !isPolite) return;

      try {
        await conn.setRemoteDescription(new RTCSessionDescription(sdp));
        await drainCandidates();
        const answer = await conn.createAnswer();
        await conn.setLocalDescription(answer);
        await pushSignal("answer", answer);
      } catch (e) {
        console.warn("[WebRTC] handleOffer error:", e);
      }
    },
    [drainCandidates, pushSignal, isInitiator],
  );

  /* --- Connection quality monitoring --- */

  const startQualityMonitor = useCallback(() => {
    if (statsTimerRef.current) return;
    statsTimerRef.current = setInterval(async () => {
      const conn = pcRef.current;
      if (!conn || conn.connectionState !== "connected") return;
      try {
        const stats = await conn.getStats();
        let rtt = 0;
        let loss = 0;
        stats.forEach((r) => {
          if (r.type === "candidate-pair" && (r as Record<string, unknown>).state === "succeeded") {
            rtt = (r as Record<string, unknown>).currentRoundTripTime as number ?? 0;
          }
          if (r.type === "inbound-rtp" && r.kind === "video") {
            const lost = (r as Record<string, number>).packetsLost ?? 0;
            const recv = (r as Record<string, number>).packetsReceived ?? 0;
            loss = recv > 0 ? lost / (lost + recv) : 0;
          }
        });
        if (rtt < 0.1 && loss < 0.02) setConnectionQuality("excellent");
        else if (rtt < 0.3 && loss < 0.05) setConnectionQuality("good");
        else if (rtt < 0.5 && loss < 0.1) setConnectionQuality("fair");
        else setConnectionQuality("poor");

        // Auto bitrate
        const sender = conn.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          const params = sender.getParameters();
          if (!params.encodings?.length) params.encodings = [{}];
          const maxBr = loss > 0.1 ? 400_000 : loss > 0.05 ? 800_000 : 2_000_000;
          params.encodings[0].maxBitrate = maxBr;
          await sender.setParameters(params);
        }
      } catch { /* stats unavailable */ }
    }, QUALITY_INTERVAL);
  }, []);

  /* --- ICE Restart --- */

  const attemptIceRestart = useCallback(async () => {
    const conn = pcRef.current;
    if (!conn || manuallyClosingRef.current) return;
    if (conn.connectionState === "connected") return;
    try {
      console.log("[WebRTC] Attempting ICE restart...");
      makingOfferRef.current = true;
      const offer = await conn.createOffer({ iceRestart: true });
      if (conn.signalingState === "stable") {
        await conn.setLocalDescription(offer);
        await pushSignal("offer", offer);
      }
    } catch (e) {
      console.warn("[WebRTC] ICE restart failed:", e);
    } finally {
      makingOfferRef.current = false;
    }
  }, [pushSignal]);

  /* ---------- START ---------- */

  const start = useCallback(
    async (withVideo = true) => {
      if (startedRef.current) return;
      startedRef.current = true;

      try {
        setError(null);
        setStatus("requesting_media");

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: withVideo
            ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24 } }
            : false,
        });
        setLocalStream(stream);
        if (!withVideo) setCamEnabled(false);
        setStatus("connecting");

        // Clean up old signals for this room from this user
        await supabase.from("webrtc_signals").delete().eq("room_id", roomId).eq("sender_id", userId);

        const conn = new RTCPeerConnection(ICE_SERVERS);
        manuallyClosingRef.current = false;
        channelReadyRef.current = false;
        connectedOnceRef.current = false;
        pcRef.current = conn;

        const remote = new MediaStream();
        setRemoteStream(remote);

        conn.ontrack = (e) => {
          e.streams[0]?.getTracks().forEach((t) => {
            if (!remote.getTracks().find((rt) => rt.id === t.id)) {
              remote.addTrack(t);
            }
          });
          setRemoteStream(new MediaStream(remote.getTracks()));
        };

        conn.onicecandidate = async (e) => {
          if (e.candidate) await pushSignal("candidate", e.candidate.toJSON());
        };

        // onnegotiationneeded: only fires for renegotiation (screen share etc.)
        // Initial offer is created explicitly below.
        conn.onnegotiationneeded = async () => {
          if (!channelReadyRef.current) return; // skip during setup
          if (!connectedOnceRef.current) return; // only for renegotiation
          try {
            makingOfferRef.current = true;
            const offer = await conn.createOffer();
            if (conn.signalingState !== "stable") return;
            await conn.setLocalDescription(offer);
            await pushSignal("offer", offer);
          } catch (e) {
            console.warn("[WebRTC] renegotiation error:", e);
          } finally {
            makingOfferRef.current = false;
          }
        };

        conn.onconnectionstatechange = () => {
          if (manuallyClosingRef.current) return;
          const state = conn.connectionState;
          console.log("[WebRTC] connectionState:", state);
          if (state === "connected") {
            setStatus("connected");
            connectedOnceRef.current = true;
            startQualityMonitor();
            if (iceRestartTimerRef.current) {
              clearTimeout(iceRestartTimerRef.current);
              iceRestartTimerRef.current = null;
            }
          }
          if (state === "failed") {
            // Try ICE restart before giving up
            if (!iceRestartTimerRef.current) {
              setError("Reconnectando...");
              iceRestartTimerRef.current = setTimeout(() => {
                iceRestartTimerRef.current = null;
                if (pcRef.current?.connectionState === "failed") {
                  attemptIceRestart();
                }
              }, ICE_RESTART_DELAY);
            }
          }
          if (state === "disconnected") {
            if (connectedOnceRef.current) {
              setError("Reconectando...");
            }
          }
          if (state === "closed") {
            setStatus("ended");
            setRemoteStream(null);
          }
        };

        conn.oniceconnectionstatechange = () => {
          if (manuallyClosingRef.current) return;
          const state = conn.iceConnectionState;
          console.log("[WebRTC] iceConnectionState:", state);
          if (state === "failed" && isInitiator) {
            attemptIceRestart();
          }
        };

        // Add tracks but DON'T let onnegotiationneeded fire the initial offer
        stream.getTracks().forEach((t) => conn.addTrack(t, stream));

        // Subscribe to Realtime signaling channel
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("Timeout al conectar canal de señalización")), 15_000);
          const channel = supabase
            .channel(`webrtc-room-${roomId}`)
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "webrtc_signals",
                filter: `room_id=eq.${roomId}`,
              },
              async (payload) => {
                const sig = payload.new as {
                  sender_id: string;
                  type: string;
                  payload: RTCSessionDescriptionInit & RTCIceCandidateInit;
                };
                if (sig.sender_id === userId) return;

                if (sig.type === "offer") {
                  await handleOffer(sig.payload);
                } else if (sig.type === "answer") {
                  const c = pcRef.current;
                  if (c && c.signalingState === "have-local-offer") {
                    try {
                      await c.setRemoteDescription(new RTCSessionDescription(sig.payload));
                      await drainCandidates();
                    } catch (e) {
                      console.warn("[WebRTC] answer error:", e);
                    }
                  }
                } else if (sig.type === "candidate") {
                  await applyCandidate(sig.payload);
                }
              },
            )
            .subscribe((st) => {
              if (st === "SUBSCRIBED") {
                clearTimeout(timeout);
                resolve();
              }
            });

          channelRef.current = channel;
        });

        channelReadyRef.current = true;

        // Process existing signals (late joiner catches up)
        const { data: existing } = await supabase
          .from("webrtc_signals")
          .select("*")
          .eq("room_id", roomId)
          .neq("sender_id", userId)
          .order("created_at", { ascending: true });

        for (const sig of existing ?? []) {
          if (sig.type === "offer") {
            await handleOffer(sig.payload);
          } else if (sig.type === "answer") {
            if (conn.signalingState === "have-local-offer") {
              try {
                await conn.setRemoteDescription(new RTCSessionDescription(sig.payload));
                await drainCandidates();
              } catch { /* stale */ }
            }
          } else if (sig.type === "candidate") {
            await applyCandidate(sig.payload);
          }
        }

        // Initiator creates the initial offer AFTER channel is ready
        if (isInitiator) {
          makingOfferRef.current = true;
          try {
            const offer = await conn.createOffer();
            await conn.setLocalDescription(offer);
            await pushSignal("offer", offer);
          } finally {
            makingOfferRef.current = false;
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Permission denied") || msg.includes("NotAllowedError")) {
          setError("Permiso denegado. Permite cámara/micrófono en tu navegador y recarga.");
        } else if (msg.includes("NotFoundError") || msg.includes("DevicesNotFoundError")) {
          setError("No se encontró cámara o micrófono. Conecta un dispositivo.");
        } else if (msg.includes("Timeout")) {
          setError("No se pudo conectar al servidor de señalización. Recarga la página.");
        } else {
          setError(`Error de inicio: ${msg}`);
        }
        setStatus("error");
        startedRef.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roomId, userId, isInitiator, handleOffer],
  );

  /* ---------- Toggles ---------- */

  const toggleMic = useCallback(() => {
    if (!localStream) return;
    const next = !micEnabled;
    localStream.getAudioTracks().forEach((t) => { t.enabled = next; });
    setMicEnabled(next);
  }, [localStream, micEnabled]);

  const toggleCam = useCallback(() => {
    if (!localStream) return;
    const next = !camEnabled;
    localStream.getVideoTracks().forEach((t) => { t.enabled = next; });
    setCamEnabled(next);
  }, [localStream, camEnabled]);

  /* ---------- Screen sharing ---------- */

  const shareScreen = useCallback(
    async (withAudio = false) => {
      const conn = pcRef.current;
      if (!conn || !localStream) return;
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: withAudio,
        });
        const screenTrack = displayStream.getVideoTracks()[0];
        const videoSender = conn.getSenders().find((s) => s.track?.kind === "video");
        if (videoSender?.track) originalVideoTrackRef.current = videoSender.track;
        if (videoSender) await videoSender.replaceTrack(screenTrack);
        screenTrack.onended = () => { stopScreenShare(); };
        setScreenStream(displayStream);
        setIsScreenSharing(true);
      } catch { /* user cancelled */ }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [localStream],
  );

  const stopScreenShare = useCallback(() => {
    const conn = pcRef.current;
    if (!conn) return;
    if (originalVideoTrackRef.current) {
      const vs = conn.getSenders().find((s) => s.track?.kind === "video");
      if (vs) vs.replaceTrack(originalVideoTrackRef.current);
      originalVideoTrackRef.current = null;
    }
    screenStream?.getTracks().forEach((t) => t.stop());
    setScreenStream(null);
    setIsScreenSharing(false);
  }, [screenStream]);

  /* ---------- Destroy ---------- */

  const destroy = useCallback(() => {
    manuallyClosingRef.current = true;
    if (statsTimerRef.current) { clearInterval(statsTimerRef.current); statsTimerRef.current = null; }
    if (iceRestartTimerRef.current) { clearTimeout(iceRestartTimerRef.current); iceRestartTimerRef.current = null; }
    channelRef.current?.unsubscribe();
    channelRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    localStream?.getTracks().forEach((t) => t.stop());
    screenStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setScreenStream(null);
    setIsScreenSharing(false);
    setStatus("idle");
    setConnectionQuality("unknown");
    pendingCandidates.current = [];
    startedRef.current = false;
    makingOfferRef.current = false;
    channelReadyRef.current = false;
    connectedOnceRef.current = false;
    manuallyClosingRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStream, screenStream]);

  useEffect(() => {
    return () => {
      if (statsTimerRef.current) clearInterval(statsTimerRef.current);
      if (iceRestartTimerRef.current) clearTimeout(iceRestartTimerRef.current);
      channelRef.current?.unsubscribe();
      pcRef.current?.close();
    };
  }, []);

  return {
    status, error, localStream, remoteStream,
    micEnabled, camEnabled,
    isScreenSharing, screenStream, connectionQuality,
    start, toggleMic, toggleCam,
    shareScreen, stopScreenShare, destroy,
  };
}