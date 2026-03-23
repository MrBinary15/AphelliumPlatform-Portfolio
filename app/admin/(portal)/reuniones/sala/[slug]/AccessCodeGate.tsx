"use client";

import { useState, type ReactNode, useRef, useEffect } from "react";
import { KeyRound, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
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
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  }

  return (
    <div className="relative flex items-center justify-center min-h-[60vh] overflow-hidden">
      {/* Ambient orbs */}
      <div className="meeting-orb w-80 h-80 bg-amber-500/6 -top-32 -right-20" style={{ animationDelay: "-2s" }} />
      <div className="meeting-orb w-64 h-64 bg-cyan-500/5 -bottom-16 -left-16" style={{ animationDelay: "-7s" }} />

      <div className="relative w-full max-w-sm px-4 animate-fade-in-up">
        <div className="glass-card rounded-3xl p-8 shadow-2xl">
          {/* Icon section */}
          <div className="relative mx-auto mb-6 w-20 h-20">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/10 animate-breathe" />
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/10 border border-amber-500/25 flex items-center justify-center">
              <KeyRound className="text-amber-400" size={32} />
            </div>
          </div>

          {/* Header */}
          <h2 className="text-2xl font-bold text-white mb-1 tracking-tight text-center">Código de acceso</h2>
          <div className="flex items-center justify-center gap-2 mb-7">
            <ShieldCheck size={12} className="text-gray-500" />
            <p className="text-sm text-gray-400 line-clamp-1">{meetingTitle}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className={`relative transition-transform ${shake ? "animate-[wiggle_0.08s_ease-in-out_3]" : ""}`}>
              <input
                ref={inputRef}
                type="text"
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()); setError(null); }}
                maxLength={20}
                placeholder="Ingresa el código"
                className={`w-full px-5 py-4 rounded-2xl bg-white/[0.03] border text-white text-center text-lg font-mono tracking-[0.3em] placeholder:text-gray-500 placeholder:tracking-normal placeholder:font-sans placeholder:text-sm focus:outline-none transition-all duration-300 ${
                  error
                    ? "border-red-500/50 focus:border-red-500/70 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
                    : code.length > 0
                    ? "border-cyan-500/40 focus:border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.08)]"
                    : "border-white/10 focus:border-white/20"
                }`}
              />
              {/* Character count indicator */}
              {code.length > 0 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <span className="text-[10px] text-gray-500 font-mono">{code.length}</span>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 animate-fade-in">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={checking || !code.trim()}
              className="btn-premium w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100 transition-all text-sm shadow-lg shadow-cyan-500/20 active:scale-[0.98]"
            >
              {checking ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  Verificar código <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Footer hint */}
          <p className="text-[11px] text-gray-600 mt-5 text-center">
            Solicita el código al anfitrión de la reunión
          </p>
        </div>
      </div>
    </div>
  );
}
