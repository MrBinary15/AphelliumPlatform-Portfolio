"use client";

import { Lock, Mail, Loader2, ArrowLeft, CheckCircle, Home } from "lucide-react";
import { login, requestPasswordReset } from "./actions";
import { useState } from "react";
import Link from "next/link";

export default function AdminLoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "recovery">("login");
  const [recoverySent, setRecoverySent] = useState(false);

  async function handleLogin(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await login(formData);
    if (result?.error) {
      setError(result.error);
    }
    setLoading(false);
  }

  async function handleRecovery(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await requestPasswordReset(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setRecoverySent(true);
    }
    setLoading(false);
  }

  function switchToRecovery() {
    setMode("recovery");
    setError(null);
    setRecoverySent(false);
  }

  function switchToLogin() {
    setMode("login");
    setError(null);
    setRecoverySent(false);
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[var(--bg-darker)] p-3 sm:p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-[var(--accent-cyan)]/5 rounded-full blur-[150px] -z-10 pointer-events-none"></div>
      
      <div className="w-full max-w-md bg-glass/80 backdrop-blur-xl p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10 shadow-2xl relative">
         <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-green)]"></div>

        <div className="text-center mb-7 sm:mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-[var(--accent-cyan)]/20 to-[var(--accent-green)]/20 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="text-[var(--accent-cyan)]" size={32} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {mode === "login" ? (
              <>Portal <span className="text-gradient">Empleados</span></>
            ) : (
              <>Recuperar <span className="text-gradient">Contraseña</span></>
            )}
          </h1>
          <p className="text-sm text-gray-400 mt-2">
            {mode === "login"
              ? "Acceso restringido al sistema APHE"
              : "Ingresa tu correo para recibir el enlace de recuperación"}
          </p>
          <div className="mt-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-[var(--accent-cyan)] transition-colors py-1.5 px-3 rounded-lg hover:bg-white/5"
            >
              <Home size={16} />
              Ir al Menú Principal
            </Link>
          </div>
        </div>

        {/* ── LOGIN FORM ── */}
        {mode === "login" && (
          <form action={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm text-center">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">Correo Corporativo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                  <Mail size={18} />
                </div>
                <input 
                  type="email" 
                  id="email" 
                  name="email"
                  required
                  className="w-full bg-black/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[var(--accent-cyan)] focus:ring-1 focus:ring-[var(--accent-cyan)] transition-all"
                  placeholder="usuario@aphellium.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-2">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                  <Lock size={18} />
                </div>
                <input 
                  type="password" 
                  id="password" 
                  name="password"
                  required
                  className="w-full bg-black/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[var(--accent-cyan)] focus:ring-1 focus:ring-[var(--accent-cyan)] transition-all"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-white text-black font-bold text-base sm:text-lg py-3 rounded-xl hover:bg-gray-200 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Verificando...
                  </>
                ) : (
                  "Iniciar Sesión"
                )}
              </button>

              <button
                type="button"
                onClick={switchToRecovery}
                className="w-full text-sm text-gray-400 hover:text-[var(--accent-cyan)] transition-colors py-2"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </form>
        )}

        {/* ── RECOVERY FORM ── */}
        {mode === "recovery" && !recoverySent && (
          <form action={handleRecovery} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm text-center">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="recovery-email" className="block text-sm font-medium text-gray-400 mb-2">Correo Corporativo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                  <Mail size={18} />
                </div>
                <input 
                  type="email" 
                  id="recovery-email" 
                  name="email"
                  required
                  className="w-full bg-black/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[var(--accent-cyan)] focus:ring-1 focus:ring-[var(--accent-cyan)] transition-all"
                  placeholder="usuario@aphellium.com"
                />
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-white text-black font-bold text-base sm:text-lg py-3 rounded-xl hover:bg-gray-200 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Enviando...
                  </>
                ) : (
                  "Enviar Enlace de Recuperación"
                )}
              </button>

              <button
                type="button"
                onClick={switchToLogin}
                className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-white transition-colors py-2"
              >
                <ArrowLeft size={14} />
                Volver al inicio de sesión
              </button>
            </div>
          </form>
        )}

        {/* ── RECOVERY SENT CONFIRMATION ── */}
        {mode === "recovery" && recoverySent && (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="text-emerald-400" size={32} />
              </div>
            </div>
            <div>
              <p className="text-white font-medium">Correo enviado</p>
              <p className="text-sm text-gray-400 mt-2">
                Si la cuenta existe, recibirás un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada y la carpeta de spam.
              </p>
            </div>
            <button
              type="button"
              onClick={switchToLogin}
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-white transition-colors py-2"
            >
              <ArrowLeft size={14} />
              Volver al inicio de sesión
            </button>
          </div>
        )}
        
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>Plataforma de gestión interna comercial y operativa.</p>
          <p className="mt-1">Monitoreo de Telemetría APHE v2.2</p>
        </div>

      </div>
    </main>
  );
}
