"use client";

import { useState, type ReactNode } from "react";
import { KeyRound, ArrowRight, Loader2 } from "lucide-react";
import { verifyMeetingCode } from "../../actions";

interface Props {
  meetingId: string;
  meetingTitle: string;
  children: ReactNode;
}

export default function AccessCodeGate({ meetingId, meetingTitle, children }: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [granted, setGranted] = useState(false);

  if (granted) return <>{children}</>;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setChecking(true);
    setError(null);
    const result = await verifyMeetingCode(meetingId, code.trim());
    setChecking(false);
    if (result.granted) {
      setGranted(true);
    } else {
      setError(result.error || "Código incorrecto");
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-white/10 bg-[#0a0f1a] p-8 shadow-2xl text-center">
          <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <KeyRound className="text-amber-400" size={28} />
          </div>

          <h2 className="text-xl font-bold text-white mb-1">Código de acceso</h2>
          <p className="text-sm text-gray-400 mb-6 line-clamp-1">{meetingTitle}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())}
              maxLength={20}
              placeholder="Ingresa el código"
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-center text-lg font-mono tracking-[0.3em] placeholder:text-gray-500 placeholder:tracking-normal placeholder:font-sans placeholder:text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
            />

            {error && (
              <p className="text-red-400 text-xs">{error}</p>
            )}

            <button
              type="submit"
              disabled={checking || !code.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold hover:brightness-110 disabled:opacity-50 transition-all text-sm shadow-lg shadow-cyan-500/20"
            >
              {checking ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  Entrar <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="text-[11px] text-gray-600 mt-4">Solicita el código al anfitrión de la reunión.</p>
        </div>
      </div>
    </div>
  );
}
