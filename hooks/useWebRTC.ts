"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export type RTCStatus =
  | "idle"
  | "requesting_media"
  | "connecting"
  | "connected"
  | "error";

const STUN_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
  ],
};

interface UseWebRTCOptions {
  /** Supabase meetings.id – used as the signaling room */
  roomId: string;
  /** auth.uid() of the current user */
  userId: string;
  /**
   * true  → host: creates and sends the offer.
   * false → guest: reads the existing offer and sends the answer.
   */
  isInitiator: boolean;
}

export function useWebRTC({ roomId, userId, isInitiator }: UseWebRTCOptions) {
  const supabase = createClient();

  const [status, setStatus] = useState<RTCStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const startedRef = useRef(false);

  /* ── Insert a signal into Supabase ── */
  const pushSignal = useCallback(
    async (
      type: "offer" | "answer" | "candidate",
      payload: RTCSessionDescriptionInit | RTCIceCandidateInit
    ) => {
      await supabase.from("webrtc_signals").insert({
        room_id: roomId,
        sender_id: userId,
        type,
        payload,
      });
    },
    [supabase, roomId, userId]
  );

  /* ── Add ICE candidate (queue if remote description isn't set yet) ── */
  const applyCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    const conn = pcRef.current;
    if (!conn) return;
    if (conn.remoteDescription) {
      await conn.addIceCandidate(new RTCIceCandidate(candidate));
    } else {
      pendingCandidates.current.push(candidate);
    }
  }, []);

  /* ── Flush buffered ICE candidates ── */
  const drainCandidates = useCallback(async () => {
    const conn = pcRef.current;
    if (!conn) return;
    for (const c of pendingCandidates.current) {
      await conn.addIceCandidate(new RTCIceCandidate(c));
    }
    pendingCandidates.current = [];
  }, []);

  /* ── Main start function ── */
  const start = useCallback(
    async (withVideo = true) => {
      if (startedRef.current) return;
      startedRef.current = true;

      try {
        setError(null);
        setStatus("requesting_media");

        // 1. Get local media
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: withVideo,
        });
        setLocalStream(stream);
        setStatus("connecting");

        // 2. Create peer connection
        const conn = new RTCPeerConnection(STUN_SERVERS);
        pcRef.current = conn;

        // Build up the remote stream track by track
        const remote = new MediaStream();
        setRemoteStream(remote);

        conn.ontrack = (e) => {
          e.streams[0]?.getTracks().forEach((t) => remote.addTrack(t));
        };

        conn.onicecandidate = async (e) => {
          if (e.candidate) await pushSignal("candidate", e.candidate.toJSON());
        };

        conn.onconnectionstatechange = () => {
          if (conn.connectionState === "connected") setStatus("connected");
          if (conn.connectionState === "failed")
            setError("La conexión P2P falló. Verifica tu conexión o firewall.");
        };

        // 3. Add local tracks
        stream.getTracks().forEach((t) => conn.addTrack(t, stream));

        // 4. Subscribe to realtime signals from the other peer
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
              // Ignore our own signals
              if (sig.sender_id === userId) return;

              if (sig.type === "offer") {
                if (conn.signalingState !== "stable" && conn.signalingState !== "have-local-offer") return;
                await conn.setRemoteDescription(new RTCSessionDescription(sig.payload));
                await drainCandidates();
                const answer = await conn.createAnswer();
                await conn.setLocalDescription(answer);
                await pushSignal("answer", answer);
              } else if (sig.type === "answer") {
                if (conn.signalingState === "have-local-offer") {
                  await conn.setRemoteDescription(new RTCSessionDescription(sig.payload));
                  await drainCandidates();
                }
              } else if (sig.type === "candidate") {
                await applyCandidate(sig.payload);
              }
            }
          )
          .subscribe();

        channelRef.current = channel;

        // 5. Fetch any signals that already exist in the table
        //    (handles the late-joiner case where the offer was sent before we subscribed)
        const { data: existing } = await supabase
          .from("webrtc_signals")
          .select("*")
          .eq("room_id", roomId)
          .neq("sender_id", userId)
          .order("created_at", { ascending: true });

        for (const sig of existing ?? []) {
          if (sig.type === "offer" && !isInitiator) {
            if (!conn.remoteDescription) {
              await conn.setRemoteDescription(new RTCSessionDescription(sig.payload));
              await drainCandidates();
              const answer = await conn.createAnswer();
              await conn.setLocalDescription(answer);
              await pushSignal("answer", answer);
            }
          } else if (sig.type === "answer" && isInitiator) {
            if (!conn.remoteDescription) {
              await conn.setRemoteDescription(new RTCSessionDescription(sig.payload));
              await drainCandidates();
            }
          } else if (sig.type === "candidate") {
            await applyCandidate(sig.payload);
          }
        }

        // 6. Initiator creates the initial offer
        if (isInitiator) {
          const alreadyAnswered = existing?.some((s) => s.type === "answer");
          if (!alreadyAnswered) {
            const offer = await conn.createOffer();
            await conn.setLocalDescription(offer);
            await pushSignal("offer", offer);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Permission denied") || msg.includes("NotAllowedError")) {
          setError(
            "Permiso denegado. Permite el acceso a cámara/micrófono en tu navegador y recarga."
          );
        } else if (msg.includes("NotFoundError") || msg.includes("DevicesNotFoundError")) {
          setError("No se encontró cámara o micrófono. Conecta un dispositivo e intenta de nuevo.");
        } else {
          setError(`Error de inicio: ${msg}`);
        }
        setStatus("error");
        startedRef.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roomId, userId, isInitiator]
  );

  /* ── Toggle mic ── */
  const toggleMic = useCallback(() => {
    if (!localStream) return;
    const next = !micEnabled;
    localStream.getAudioTracks().forEach((t) => {
      t.enabled = next;
    });
    setMicEnabled(next);
  }, [localStream, micEnabled]);

  /* ── Toggle camera ── */
  const toggleCam = useCallback(() => {
    if (!localStream) return;
    const next = !camEnabled;
    localStream.getVideoTracks().forEach((t) => {
      t.enabled = next;
    });
    setCamEnabled(next);
  }, [localStream, camEnabled]);

  /* ── Destroy connection and release resources ── */
  const destroy = useCallback(() => {
    channelRef.current?.unsubscribe();
    channelRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    localStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setStatus("idle");
    pendingCandidates.current = [];
    startedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStream]);

  /* ── Cleanup on unmount ── */
  useEffect(() => {
    return () => {
      channelRef.current?.unsubscribe();
      pcRef.current?.close();
      localStream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    error,
    localStream,
    remoteStream,
    micEnabled,
    camEnabled,
    start,
    toggleMic,
    toggleCam,
    destroy,
  };
}
