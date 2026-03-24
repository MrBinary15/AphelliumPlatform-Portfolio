"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Download, Bell, X } from "lucide-react";

// ─── Utility: URL-safe base64 to Uint8Array ───────────
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAManager({ userId }: { userId: string | null }) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const subscribedRef = useRef(false);

  // ─── Auto-subscribe to push if permission granted ──
  const subscribeToPush = useCallback(async () => {
    if (subscribedRef.current || !userId || !registrationRef.current) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      console.warn("[PWA] VAPID public key missing");
      return;
    }

    try {
      let subscription = await registrationRef.current.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registrationRef.current.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
        });
      }

      // Send subscription to server and verify it was saved
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON(), userId }),
      });

      if (res.ok) {
        subscribedRef.current = true;
      } else {
        console.warn("[PWA] Server rejected push subscription:", res.status);
      }
    } catch (err) {
      console.warn("[PWA] Push subscription failed:", err);
    }
  }, [userId]);

  // ─── Register Service Worker (always, needed for PWA detection) ──
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        registrationRef.current = reg;
        // Check for updates periodically
        setInterval(() => reg.update(), 60 * 60 * 1000); // hourly
        // Register periodic background sync to keep SW alive for push
        if ("periodicSync" in reg) {
          (reg as unknown as { periodicSync: { register: (tag: string, opts: { minInterval: number }) => Promise<void> } })
            .periodicSync.register("keep-alive", { minInterval: 12 * 60 * 60 * 1000 }).catch(() => {});
        }
        // Auto-subscribe if permission already granted
        if (userId) subscribeToPush();
      })
      .catch((err) => console.warn("SW registration failed:", err));
  }, [userId, subscribeToPush]);

  // ─── Track notification permission ───────────────
  useEffect(() => {
    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  // ─── Install prompt handling (only for logged-in users) ──
  useEffect(() => {
    if (!userId) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      // Show banner after a short delay
      const dismissed = sessionStorage.getItem("pwa-install-dismissed");
      if (!dismissed) {
        setTimeout(() => setShowInstallBanner(true), 3000);
      }
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [userId]);

  useEffect(() => {
    if (notifPermission === "granted" && userId) {
      subscribeToPush();
    }
  }, [notifPermission, userId, subscribeToPush]);

  // ─── Handlers ────────────────────────────────────
  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setShowInstallBanner(false);
      setInstallPrompt(null);
      // After install, prompt for notifications
      if (userId && Notification.permission === "default") {
        setTimeout(() => setShowNotifPrompt(true), 2000);
      }
    }
  };

  const handleEnableNotifications = async () => {
    const permission = await Notification.requestPermission();
    setNotifPermission(permission);
    setShowNotifPrompt(false);
    if (permission === "granted") {
      await subscribeToPush();
    }
  };

  const dismissInstall = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem("pwa-install-dismissed", "1");
  };

  // ─── Prompt notifications for logged-in users ────
  useEffect(() => {
    if (!userId) return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    // Show prompt after user has been on the page a bit
    const timer = setTimeout(() => {
      const dismissed = localStorage.getItem("pwa-notif-dismissed");
      if (!dismissed) setShowNotifPrompt(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, [userId]);

  const dismissNotifPrompt = () => {
    setShowNotifPrompt(false);
    localStorage.setItem("pwa-notif-dismissed", "1");
  };

  return (
    <>
      {/* ── Install Banner ── */}
      {showInstallBanner && installPrompt && (
        <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-[360px] z-[70] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-[#0f1117]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl shadow-black/40">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-green)] flex items-center justify-center">
                <Download size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white mb-0.5">Instalar Aphellium</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Instala la app en tu teléfono para acceso rápido, notificaciones de llamadas y mensajes.
                </p>
              </div>
              <button onClick={dismissInstall} className="text-gray-500 hover:text-white transition-colors p-1">
                <X size={16} />
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleInstall}
                className="flex-1 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-green)] text-white text-sm font-semibold py-2.5 rounded-xl hover:opacity-90 transition-opacity"
              >
                Instalar
              </button>
              <button
                onClick={dismissInstall}
                className="px-4 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Ahora no
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Notification Permission Prompt ── */}
      {showNotifPrompt && (
        <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-[360px] z-[70] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-[#0f1117]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl shadow-black/40">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Bell size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white mb-0.5">Activar notificaciones</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Recibe alertas de llamadas, mensajes y soporte técnico aunque no estés en la app.
                </p>
              </div>
              <button onClick={dismissNotifPrompt} className="text-gray-500 hover:text-white transition-colors p-1">
                <X size={16} />
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleEnableNotifications}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold py-2.5 rounded-xl hover:opacity-90 transition-opacity"
              >
                Activar
              </button>
              <button
                onClick={dismissNotifPrompt}
                className="px-4 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Ahora no
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
