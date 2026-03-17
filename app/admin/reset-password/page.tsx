"use client";

import { Lock, Loader2, CheckCircle, ShieldCheck } from "lucide-react";
import { updatePassword } from "./actions";
import { useState } from "react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await updatePassword(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-darker)] p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-[var(--accent-cyan)]/5 rounded-full blur-[150px] -z-10 pointer-events-none"></div>

      <div className="w-full max-w-md bg-glass/80 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl relative">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-green)]"></div>

        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-[var(--accent-cyan)]/20 to-[var(--accent-green)]/20 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="text-[var(--accent-cyan)]" size={32} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Nueva <span className="text-gradient">Contraseña</span>
          </h1>
          <p className="text-sm text-gray-400 mt-2">
            Establece una contraseña segura para tu cuenta
          </p>
        </div>

        {!success ? (
          <form action={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm text-center">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-2">
                Nueva Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                  minLength={8}
                  className="w-full bg-black/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[var(--accent-cyan)] focus:ring-1 focus:ring-[var(--accent-cyan)] transition-all"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-400 mb-2">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  required
                  minLength={8}
                  className="w-full bg-black/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[var(--accent-cyan)] focus:ring-1 focus:ring-[var(--accent-cyan)] transition-all"
                  placeholder="Repite la contraseña"
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black font-bold text-lg py-3 rounded-xl hover:bg-gray-200 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Actualizando...
                  </>
                ) : (
                  "Actualizar Contraseña"
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="text-emerald-400" size={32} />
              </div>
            </div>
            <div>
              <p className="text-white font-medium">Contraseña actualizada</p>
              <p className="text-sm text-gray-400 mt-2">
                Tu contraseña ha sido cambiada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.
              </p>
            </div>
            <Link
              href="/admin/dashboard"
              className="inline-block w-full bg-white text-black font-bold text-lg py-3 rounded-xl hover:bg-gray-200 transition-colors text-center"
            >
              Ir al Panel
            </Link>
          </div>
        )}

        <div className="mt-8 text-center text-xs text-gray-500">
          <p>Plataforma de gestión interna comercial y operativa.</p>
          <p className="mt-1">Monitoreo de Telemetría APHE v1.0</p>
        </div>
      </div>
    </main>
  );
}
