"use client";

import { useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════
   HERO VIDEO BACKGROUND (optimized)
   ───────────────────────────────────────────────────────────────
   Fullscreen looping video confined to the homepage hero section.
   Gentle mouse-tracking parallax + very light particle overlay.
   Debounced resize. Pauses when tab hidden.
   ═══════════════════════════════════════════════════════════════ */

const VIDEO_SRC     = "/assets/scene-bg.mp4";
const PARTICLE_AREA = 42000;

interface Mote {
  x: number; y: number;
  vx: number; vy: number;
  r: number; a: number;
  life: number; max: number;
  hue: number;
}

function spawnMote(w: number, h: number): Mote {
  const roll = Math.random();
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.22,
    vy: -(Math.random() * 0.12 + 0.02),
    r: Math.random() * 1.8 + 0.6,
    a: Math.random() * 0.14 + 0.03,
    life: 0,
    max: Math.random() * 800 + 400,
    hue: roll < 0.4  ? 55 + Math.random() * 10
       : roll < 0.72 ? 183 + Math.random() * 6
       : 150 + Math.random() * 12,
  };
}

export default function HeroVideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const cvs      = useRef<HTMLCanvasElement>(null);
  const ptr      = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 });
  const rafId    = useRef(0);
  const motes    = useRef<Mote[]>([]);

  const fitCanvas = useCallback(() => {
    const c = cvs.current;
    if (!c) return;
    const rect = c.parentElement?.getBoundingClientRect();
    if (rect) { c.width = rect.width; c.height = rect.height; }
  }, []);

  /* ── Pointer listeners ── */
  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      ptr.current.tx = e.clientX / window.innerWidth;
      ptr.current.ty = e.clientY / window.innerHeight;
    };
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma != null && e.beta != null) {
        ptr.current.tx = Math.max(0.15, Math.min(0.85, 0.5 + e.gamma / 140));
        ptr.current.ty = Math.max(0.15, Math.min(0.85, 0.5 + (e.beta - 35) / 110));
      }
    };
    window.addEventListener("mousemove", onMouse, { passive: true });
    window.addEventListener("deviceorientation", onOrient, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("deviceorientation", onOrient);
    };
  }, []);

  /* ── Canvas setup (debounced resize) ── */
  useEffect(() => {
    const c = cvs.current;
    if (!c) return;
    fitCanvas();
    const count = Math.min(35, Math.floor((c.width * c.height) / PARTICLE_AREA));
    motes.current = Array.from({ length: count }, () => spawnMote(c.width, c.height));

    let resizeTimer: ReturnType<typeof setTimeout>;
    const debouncedFit = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(fitCanvas, 150);
    };
    window.addEventListener("resize", debouncedFit, { passive: true });
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", debouncedFit);
    };
  }, [fitCanvas]);

  /* ── Pause video when tab hidden ── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onVis = () => {
      if (document.hidden) v.pause();
      else v.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  /* ── Animation loop ── */
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const tick = () => {
      if (document.hidden) { rafId.current = requestAnimationFrame(tick); return; }

      const p = ptr.current;
      p.x += (p.tx - p.x) * 0.03;
      p.y += (p.ty - p.y) * 0.03;

      const mx = (p.x - 0.5) * 2;
      const my = (p.y - 0.5) * 2;

      /* ── Video parallax (gentle) ── */
      if (!reduced && wrapRef.current) {
        const tx = mx * 8;
        const ty = my * 5;
        wrapRef.current.style.transform = `translate3d(${tx}px,${ty}px,0) scale(1.04)`;
      }

      /* ── Particles ── */
      const c = cvs.current;
      const ctx = c?.getContext("2d");
      if (c && ctx && !reduced) {
        const w = c.width, h = c.height;
        ctx.clearRect(0, 0, w, h);
        const now = performance.now() * 0.001;

        const windX = Math.sin(now * 0.28) * 0.06;
        const windY = Math.cos(now * 0.18) * 0.03;

        for (const q of motes.current) {
          q.life++;
          q.vx += windX * 0.01;
          q.vy += windY * 0.005 - 0.0005;
          q.vx *= 0.995;
          q.vy *= 0.995;
          q.x += q.vx;
          q.y += q.vy;

          if (q.x < -10) q.x = w + 10;
          if (q.x > w + 10) q.x = -10;
          if (q.y < -10) q.y = h + 10;
          if (q.y > h + 10) q.y = -10;

          if (q.life > q.max) Object.assign(q, spawnMote(w, h));

          const frac = q.life / q.max;
          const fade = frac < 0.12 ? frac / 0.12 : frac > 0.85 ? (1 - frac) / 0.15 : 1;

          const sat = q.hue < 100 ? 58 : 48;
          const lit = q.hue < 100 ? 82 : 76;
          ctx.beginPath();
          ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${q.hue},${sat}%,${lit}%,${q.a * fade})`;
          ctx.fill();
        }
      }

      rafId.current = requestAnimationFrame(tick);
    };

    rafId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId.current);
  }, []);

  return (
    <div className="hero-video-scene" aria-hidden="true">
      <div ref={wrapRef} className="hero-video-wrap">
        <video
          ref={videoRef}
          className="hero-video"
          src={VIDEO_SRC}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
        />
      </div>
      <div className="hero-video-vignette" />
      <canvas ref={cvs} className="hero-video-particles" />
    </div>
  );
}
