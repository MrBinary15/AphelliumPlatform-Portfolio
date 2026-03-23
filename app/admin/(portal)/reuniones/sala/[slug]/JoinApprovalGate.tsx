"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, ShieldAlert, ShieldCheck } from "lucide-react";
import { getMyJoinApprovalStatus, requestJoinApproval } from "@/app/admin/(portal)/reuniones/actions";

interface Props {
  meetingId: string;
  meetingTitle: string;
  children: React.ReactNode;
}

type ApprovalStatus = "none" | "pending" | "accepted" | "declined";

export default function JoinApprovalGate({ meetingId, meetingTitle, children }: Props) {
  const [status, setStatus] = useState<ApprovalStatus>("none");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const req = await requestJoinApproval(meetingId);
      if (!active) return;
      if (req.error) {
        setError(req.error);
        setLoading(false);
        return;
      }
      if (req.status) setStatus(req.status);
      setLoading(false);
    };

    void bootstrap();

    const timer = setInterval(async () => {
      const res = await getMyJoinApprovalStatus(meetingId);
      if (!active) return;
      if (res.error) {
        setError(res.error);
        return;
      }
      setStatus((res.status ?? "none") as ApprovalStatus);
    }, 3000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [meetingId]);

  if (status === "accepted") {
    return <>{children}</>;
  }

  const isDeclined = !loading && status === "declined";
  const isPending = !loading && status === "pending";

  return (
    <div className="relative flex items-center justify-center min-h-[60vh] px-4 overflow-hidden">
      {/* Ambient orbs */}
      <div className="meeting-orb w-72 h-72 bg-cyan-500/8 -top-20 -left-20" style={{ animationDelay: "0s" }} />
      <div className="meeting-orb w-56 h-56 bg-amber-500/6 -bottom-10 -right-10" style={{ animationDelay: "-5s" }} />

      <div className="relative w-full max-w-md animate-fade-in-up">
        {/* Card */}
        <div className={`glass-card rounded-3xl p-8 text-center transition-all duration-500 ${
          isDeclined ? "border-red-500/20" : isPending ? "animate-pulse-glow" : ""
        }`}>
          {/* Icon with ripple effect */}
          <div className="relative mx-auto mb-6 w-20 h-20">
            {/* Ripple rings for pending state */}
            {(loading || isPending) && (
              <>
                <div className="absolute inset-0 rounded-2xl border-2 border-amber-400/20" style={{ animation: "ripple 2s ease-out infinite" }} />
                <div className="absolute inset-0 rounded-2xl border-2 border-amber-400/10" style={{ animation: "ripple 2s ease-out infinite 0.6s" }} />
              </>
            )}
            <div className={`relative w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-500 ${
              isDeclined
                ? "bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30"
                : isPending
                ? "bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30"
                : "bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30"
            }`}>
              {isDeclined ? (
                <ShieldAlert size={32} className="text-red-400 animate-fade-in-scale" />
              ) : loading ? (
                <Clock3 size={32} className="text-cyan-300 animate-spin-slow" />
              ) : isPending ? (
                <ShieldCheck size={32} className="text-amber-300 animate-breathe" />
              ) : (
                <CheckCircle2 size={32} className="text-emerald-400 animate-fade-in-scale" />
              )}
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
            {isDeclined ? "Acceso denegado" : "Solicitud de ingreso"}
          </h2>

          {/* Meeting title badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <p className="text-sm text-gray-300 truncate max-w-[260px]">{meetingTitle}</p>
          </div>

          {/* Status messages */}
          <div className="space-y-3">
            {loading && (
              <div className="animate-fade-in">
                <p className="text-sm text-gray-300 mb-3">Enviando solicitud al anfitrión...</p>
                <div className="dot-loading text-cyan-400 justify-center">
                  <span /><span /><span />
                </div>
              </div>
            )}
            {isPending && (
              <div className="animate-fade-in-up space-y-3">
                <p className="text-sm text-amber-200/90 leading-relaxed">
                  Tu solicitud está pendiente de aprobación
                </p>
                {/* Waiting animation bar */}
                <div className="h-1 rounded-full bg-white/5 overflow-hidden max-w-[200px] mx-auto">
                  <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-amber-500/60 to-amber-400/30 animate-shimmer" 
                    style={{ backgroundSize: "200% 100%" }} />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  El anfitrión o co-anfitrión debe aprobar tu entrada
                </p>
              </div>
            )}
            {isDeclined && (
              <div className="animate-fade-in-up">
                <p className="text-sm text-red-300/90 mb-4">Tu solicitud fue rechazada por el anfitrión.</p>
                <button
                  onClick={() => window.history.back()}
                  className="btn-premium px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-all"
                >
                  Volver
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 animate-fade-in">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
