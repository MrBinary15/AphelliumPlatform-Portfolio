"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, ShieldAlert } from "lucide-react";
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

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0f1a] p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10">
          {status === "declined" ? (
            <ShieldAlert size={26} className="text-red-400" />
          ) : loading ? (
            <Clock3 size={26} className="text-amber-300" />
          ) : (
            <CheckCircle2 size={26} className="text-emerald-400" />
          )}
        </div>

        <h2 className="text-xl font-bold text-white mb-2">Solicitud de ingreso</h2>
        <p className="text-sm text-gray-400 mb-4">{meetingTitle}</p>

        {loading && <p className="text-sm text-gray-300">Enviando solicitud al anfitrión...</p>}
        {!loading && status === "pending" && (
          <p className="text-sm text-amber-300">Tu solicitud está pendiente. Espera aprobación del anfitrión o co-anfitrión.</p>
        )}
        {!loading && status === "declined" && (
          <p className="text-sm text-red-400">Tu solicitud fue rechazada.</p>
        )}
        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
      </div>
    </div>
  );
}
