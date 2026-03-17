"use client";

import { useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════
   IMMERSIVE VIDEO SCENE
   ───────────────────────────────────────────────────────────────
   Fullscreen looping video background with:
   • Mouse-tracking parallax shift (desktop) + gyroscope (mobile)
   • Scroll-based depth offset
   • Canvas particle system: pollen / dust motes floating over video
   • Cinematic vignette + brand color glow + grain overlays
   • Graceful reduced-motion handling
   ═══════════════════════════════════════════════════════════════ */

const VIDEO_SRC    = "/assets/scene-bg.mp4";
const PARTICLE_AREA = 28000;

/* ─── Particle type ─── */
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
    vx: (Math.random() - 0.5) * 0.32,
    vy: -(Math.random() * 0.18 + 0.03),
    r: Math.random() * 2.2 + 0.8,
    a: Math.random() * 0.2 + 0.06,
    life: 0,
    max: Math.random() * 700 + 350,
    hue: roll < 0.4 ? 55 + Math.random() * 10
       : roll < 0.72 ? 183 + Math.random() * 6
       : 150 + Math.random() * 12,
  };
}

/* ═══ Component ═══════════════════════════════════════════════ */

export default function ImmersiveParallaxScene() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const cvs      = useRef<HTMLCanvasElement>(null);
  const ptr      = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 });
  const sY       = useRef(0);
  const sSmooth  = useRef(0);
  const rafId    = useRef(0);
  const motes    = useRef<Mote[]>([]);

  /* ── Pointer / scroll / gyroscope listeners ── */
  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      ptr.current.tx = e.clientX / window.innerWidth;
      ptr.current.ty = e.clientY / window.innerHeight;
    };
    const onScroll = () => { sY.current = window.scrollY; };
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma != null && e.beta != null) {
        ptr.current.tx = Math.max(0.1, Math.min(0.9, 0.5 + e.gamma / 120));
        ptr.current.ty = Math.max(0.1, Math.min(0.9, 0.5 + (e.beta - 35) / 100));
      }
    };
    window.addEventListener("mousemove", onMouse, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("deviceorientation", onOrient, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("deviceorientation", onOrient);
    };
  }, []);

  /* ── Canvas setup ── */
  useEffect(() => {
    const c = cvs.current;
    if (!c) return;
    const fit = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    fit();
    const count = Math.min(55, Math.floor((c.width * c.height) / PARTICLE_AREA));
    motes.current = Array.from({ length: count }, () => spawnMote(c.width, c.height));
    window.addEventListener("resize", fit, { passive: true });
    return () => window.removeEventListener("resize", fit);
  }, []);

  /* ── Pause video when tab hidden to save resources ── */
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

  /* ── Master animation loop ── */
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const tick = () => {
      if (document.hidden) { rafId.current = requestAnimationFrame(tick); return; }

      const p = ptr.current;
      p.x += (p.tx - p.x) * 0.045;
      p.y += (p.ty - p.y) * 0.045;
      sSmooth.current += (sY.current - sSmooth.current) * 0.08;

      const mx = (p.x - 0.5) * 2;
      const my = (p.y - 0.5) * 2;
      const ss = sSmooth.current;
      const now = performance.now() * 0.001;

      /* ── Video parallax transform ── */
      if (!reduced && wrapRef.current) {
        const tx = mx * 22;
        const ty = my * 14 - ss * 0.15;
        wrapRef.current.style.transform = `translate3d(${tx}px,${ty}px,0) scale(1.12)`;
      }

      /* ── Particle canvas ── */
      const c = cvs.current;
      const ctx = c?.getContext("2d");
      if (c && ctx && !reduced) {
        const w = c.width, h = c.height;
        ctx.clearRect(0, 0, w, h);

        const windX = Math.sin(now * 0.35) * 0.1 + Math.sin(now * 0.82) * 0.04;
        const windY = Math.cos(now * 0.22) * 0.04;

        for (const q of motes.current) {
          q.life++;
          q.vx += windX * 0.014;
          q.vy += windY * 0.007 - 0.001;

          const dx = p.x * w - q.x;
          const dy = p.y * h - q.y;
          const d = Math.hypot(dx, dy);
          if (d < 110 && d > 0) {
            const f = ((110 - d) / 110) * 0.055;
            q.vx -= (dx / d) * f;
            q.vy -= (dy / d) * f;
          }

          q.vx *= 0.993;
          q.vy *= 0.993;
          q.x += q.vx;
          q.y += q.vy;

          if (q.x < -20) q.x = w + 20;
          if (q.x > w + 20) q.x = -20;
          if (q.y < -20) q.y = h + 20;
          if (q.y > h + 20) q.y = -20;

          if (q.life > q.max) Object.assign(q, spawnMote(w, h));

          const frac = q.life / q.max;
          const fade = frac < 0.1 ? frac / 0.1 : frac > 0.85 ? (1 - frac) / 0.15 : 1;

          const sat = q.hue < 100 ? 62 : 52;
          const lit = q.hue < 100 ? 78 : 72;
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
    <div className="parallax-scene" aria-hidden="true">
      {/* Video layer with parallax wrapper */}
      <div ref={wrapRef} className="parallax-video-wrap">
        <video
          ref={videoRef}
          className="parallax-video"
          src={VIDEO_SRC}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
        />
        {/* Dark gradient overlay on top of video */}
        <div className="parallax-video-overlay" />
      </div>

      {/* Atmospheric overlays */}
      <div className="parallax-vignette" />
      <div className="parallax-color-glow" />
      <div className="parallax-grain" />

      {/* Pollen / dust particle canvas */}
      <canvas ref={cvs} className="parallax-canvas" />
    </div>
  );
}
