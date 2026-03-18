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
  roomId: string;
  userId: string;
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
  // Guard: process offer exactly once (realtime + fetch can both deliver it)
  const offerProcessedRef = useRef(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roomId, userId]
  );

  const drainCandidates = useCallback(async () => {
    const conn = pcRef.current;
    if (!conn) return;
    for (const c of pendingCandidates.current) {
      try { await conn.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ignore stale candidates */ }
    }
    pendingCandidates.current = [];
  }, []);

  const applyCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    const conn = pcRef.current;
    if (!conn) return;
    if (conn.remoteDescription) {
      try { await conn.addIceCandidate(new RTCIceCandidate(candidate)); } catch { /* ignore */ }
    } else {
      pendingCandidates.current.push(candidate);
    }
  }, []);

  // Handle an inbound offer — idempotent via offerProcessedRef
  const handleOffer = useCallback(
    async (sdp: RTCSessionDescriptionInit) => {
      if (offerProcessedRef.current) return;
      offerProcessedRef.current = true;
      const conn = pcRef.current;
      if (!conn) return;
      await conn.setRemoteDescription(new RTCSessionDescription(sdp));
      await drainCandidates();
      const answer = await conn.createAnswer();
      await conn.setLocalDescription(answer);
      await pushSignal("answer", answer);
    },
    [drainCandidates, pushSignal]
  );

  const start = useCallback(
    async (withVideo = true) => {
      if (startedRef.current) return;
      startedRef.current = true;

      try {
        setError(null);
        setStatus("requesting_media");

        // 1. Capture media
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: withVideo,
        });
        setLocalStream(stream);
        setStatus("connecting");

        // 2. Create peer connection
        const conn = new RTCPeerConnection(STUN_SERVERS);
        pcRef.current = conn;

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
            setError("La conexion P2P fallo. Revisa tu red o firewall.");
        };

        // 3. Add local tracks
        stream.getTracks().forEach((t) => conn.addTrack(t, stream));

        // 4. Subscribe to Realtime and WAIT until subscribed before proceeding.
        //    This eliminates the race between realtime delivery and the fetch below.
        await new Promise<void>((resolve) => {
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

                if (sig.type === "offer" && !isInitiator) {
                  await handleOffer(sig.payload);
                } else if (sig.type === "answer" && isInitiator) {
                  if (!conn.remoteDescription) {
                    await conn.setRemoteDescription(new RTCSessionDescription(sig.payload));
                    await drainCandidates();
                  }
                } else if (sig.type === "candidate") {
                  await applyCandidate(sig.payload);
                }
              }
            )
            .subscribe((st) => {
              if (st === "SUBSCRIBED") resolve();
            });

          channelRef.current = channel;
        });

        // 5. Fetch signals that already exist (late-joiner / page-reload case)
        const { data: existing } = await supabase
          .from("webrtc_signals")
          .select("*")
          .eq("room_id", roomId)
          .neq("sender_id", userId)
          .order("created_at", { ascending: true });

        for (const sig of existing ?? []) {
          if (sig.type === "offer" && !isInitiator) {
            await handleOffer(sig.payload); // idempotent
          } else if (sig.type === "answer" && isInitiator) {
            if (!conn.remoteDescription) {
              await conn.setRemoteDescription(new RTCSessionDescription(sig.payload));
              await drainCandidates();
            }
          } else if (sig.type === "candidate") {
            await applyCandidate(sig.payload);
          }
        }

        // 6. Initiator creates offer (only if not already answered)
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
          setError("Permiso denegado. Permite camara/microfono en tu navegador y recarga.");
        } else if (msg.includes("NotFoundError") || msg.includes("DevicesNotFoundError")) {
          setError("No se encontro camara o microfono. Conecta un dispositivo.");
        } else {
          setError(`Error de inicio: ${msg}`);
        }
        setStatus("error");
        startedRef.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roomId, userId, isInitiator, handleOffer]
  );

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
    offerProcessedRef.current = false;
    startedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStream]);

  useEffect(() => {
    return () => {
      channelRef.current?.unsubscribe();
      pcRef.current?.close();
      localStream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, error, localStream, remoteStream, micEnabled, camEnabled, start, toggleMic, toggleCam, destroy };
}