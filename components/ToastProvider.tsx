"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

type ToastData = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const nextIdRef = useRef(1);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = nextIdRef.current++;
    setToasts((prev) => [...prev, { id, message, type }]);

    window.setTimeout(() => {
      removeToast(id);
    }, 3200);
  }, [removeToast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none">
        {toasts.map((toast) => {
          const isError = toast.type === "error";
          const isSuccess = toast.type === "success";
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto w-[min(92vw,360px)] rounded-xl border px-3 py-2 backdrop-blur-sm shadow-lg transition-all ${
                isError
                  ? "bg-rose-500/15 border-rose-400/40 text-rose-100"
                  : isSuccess
                  ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-100"
                  : "bg-cyan-500/15 border-cyan-400/40 text-cyan-100"
              }`}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-2">
                {isError ? (
                  <AlertTriangle className="h-4 w-4 mt-0.5" />
                ) : isSuccess ? (
                  <CheckCircle2 className="h-4 w-4 mt-0.5" />
                ) : (
                  <Info className="h-4 w-4 mt-0.5" />
                )}
                <p className="text-sm flex-1">{toast.message}</p>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="opacity-80 hover:opacity-100"
                  aria-label="Cerrar notificacion"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de ToastProvider");
  }
  return context;
}
