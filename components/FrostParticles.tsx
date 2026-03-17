"use client";

import { useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════
   FROST PARTICLES — Ambient cold atmosphere (optimized)
   ───────────────────────────────────────────────────────────────
   Pre-rendered sprites eliminate per-frame shadowBlur & gradient
   creation. Debounced resize. Visibility-aware RAF.
   ═══════════════════════════════════════════════════════════════ */

interface Crystal {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  opacity: number;
  life: number; max: number;
  kind: "flake" | "shard" | "dot";
  rot: number;
  rotV: number;
  wobbleAmp: number;
  wobbleFreq: number;
  wobblePhase: number;
}

function spawnCrystal(w: number, h: number): Crystal {
  const roll = Math.random();
  const kind: Crystal["kind"] =
    roll < 0.55 ? "flake" : roll < 0.78 ? "shard" : "dot";

  return {
    x: Math.random() * w,
    y: -10 - Math.random() * 120,
    vx: (Math.random() - 0.5) * 0.5,
    vy: Math.random() * 1.0 + 0.4,
    size: kind === "dot" ? Math.random() * 4.5 + 2
        : kind === "shard" ? Math.random() * 9 + 4
        : Math.random() * 8.5 + 3.5,
    opacity: Math.random() * 0.38 + 0.18,
    life: 0,
    max: Math.random() * 900 + 350,
    kind,
    rot: Math.random() * 360,
    rotV: (Math.random() - 0.5) * 0.7,
    wobbleAmp: Math.random() * 1.4 + 0.5,
    wobbleFreq: Math.random() * 0.005 + 0.002,
    wobblePhase: Math.random() * Math.PI * 2,
  };
}

const PARTICLE_AREA = 8000;

/* ── Pre-render sprites to hidden canvases (once) ── */
function createSpriteCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function buildSprites() {
  const sizes = [4, 6, 8, 10, 12];
  const flakes: HTMLCanvasElement[] = [];
  const shards: HTMLCanvasElement[] = [];
  const dots:   HTMLCanvasElement[] = [];

  for (const s of sizes) {
    // Flake sprite (with baked-in glow via shadowBlur — drawn once)
    const pad = Math.ceil(s * 2);
    const fW = (s + pad) * 2;
    const fc = createSpriteCanvas(fW, fW);
    const fCtx = fc.getContext("2d")!;
    fCtx.translate(fW / 2, fW / 2);
    fCtx.shadowColor = "rgba(180, 225, 255, 0.6)";
    fCtx.shadowBlur = s * 1.5;
    drawSnowflakeStatic(fCtx, s);
    flakes.push(fc);

    // Shard sprite
    const sW = (s + pad) * 2;
    const sc = createSpriteCanvas(sW, sW);
    const sCtx = sc.getContext("2d")!;
    sCtx.translate(sW / 2, sW / 2);
    sCtx.shadowColor = "rgba(170, 220, 255, 0.5)";
    sCtx.shadowBlur = s;
    drawShardStatic(sCtx, s);
    shards.push(sc);

    // Dot sprite (gradient baked in)
    const dR = s * 2.5;
    const dW = Math.ceil(dR * 2 + 4);
    const dc = createSpriteCanvas(dW, dW);
    const dCtx = dc.getContext("2d")!;
    const cx = dW / 2, cy = dW / 2;
    const grad = dCtx.createRadialGradient(cx, cy, 0, cx, cy, dR);
    grad.addColorStop(0, "rgba(210, 240, 255, 0.9)");
    grad.addColorStop(0.4, "rgba(180, 225, 255, 0.3)");
    grad.addColorStop(1, "rgba(160, 215, 255, 0)");
    dCtx.beginPath();
    dCtx.arc(cx, cy, dR, 0, Math.PI * 2);
    dCtx.fillStyle = grad;
    dCtx.fill();
    dCtx.beginPath();
    dCtx.arc(cx, cy, s * 0.6, 0, Math.PI * 2);
    dCtx.fillStyle = "rgba(230, 245, 255, 1)";
    dCtx.fill();
    dots.push(dc);
  }

  return { sizes, flakes, shards, dots };
}

function pickSprite(sprites: HTMLCanvasElement[], sizes: number[], size: number) {
  let best = 0;
  let bestDiff = Math.abs(size - sizes[0]);
  for (let i = 1; i < sizes.length; i++) {
    const d = Math.abs(size - sizes[i]);
    if (d < bestDiff) { bestDiff = d; best = i; }
  }
  return sprites[best];
}

export default function FrostParticles() {
  const cvs   = useRef<HTMLCanvasElement>(null);
  const motes = useRef<Crystal[]>([]);
  const rafId = useRef(0);
  const spritesRef = useRef<ReturnType<typeof buildSprites> | null>(null);

  const fitCanvas = useCallback(() => {
    const c = cvs.current;
    if (!c) return;
    c.width = window.innerWidth;
    c.height = window.innerHeight;

    const count = Math.min(250, Math.floor((c.width * c.height) / PARTICLE_AREA));
    if (motes.current.length < count) {
      const extra = count - motes.current.length;
      for (let i = 0; i < extra; i++) {
        const m = spawnCrystal(c.width, c.height);
        m.y = Math.random() * c.height;
        m.life = Math.floor(Math.random() * m.max * 0.6);
        motes.current.push(m);
      }
    } else if (motes.current.length > count) {
      motes.current.length = count;
    }
  }, []);

  /* ── Canvas sizing (debounced) ── */
  useEffect(() => {
    const c = cvs.current;
    if (!c) return;

    // Build sprite cache once
    if (!spritesRef.current) spritesRef.current = buildSprites();

    // Initial sizing
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    const count = Math.min(250, Math.floor((c.width * c.height) / PARTICLE_AREA));
    motes.current = Array.from({ length: count }, () => spawnCrystal(c.width, c.height));
    for (const m of motes.current) {
      m.y = Math.random() * c.height;
      m.life = Math.floor(Math.random() * m.max * 0.6);
    }

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

  /* ── Draw loop ── */
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const tick = () => {
      const c = cvs.current;
      const ctx = c?.getContext("2d");
      if (!c || !ctx) { rafId.current = requestAnimationFrame(tick); return; }
      if (document.hidden) { rafId.current = requestAnimationFrame(tick); return; }

      const sprites = spritesRef.current;
      if (!sprites) { rafId.current = requestAnimationFrame(tick); return; }

      const w = c.width, h = c.height;
      ctx.clearRect(0, 0, w, h);

      const now = performance.now();
      const t = now * 0.001;

      // ── Wind system: base breeze + gusts ──
      const baseBreezeX = Math.sin(t * 0.22) * 0.7 + Math.sin(t * 0.09) * 0.35;
      const baseBreezeY = Math.cos(t * 0.15) * 0.15;

      const gustCycle = Math.sin(t * 0.45) * 0.5 + 0.5;
      const gustActive = gustCycle > 0.65;
      const gustStrength = gustActive ? (gustCycle - 0.65) * (1 / 0.35) : 0;
      const gustX = gustActive ? Math.sin(t * 1.5) * 4.0 * gustStrength : 0;
      const gustY = gustActive ? Math.cos(t * 1.1) * 0.7 * gustStrength : 0;

      const windX = baseBreezeX + gustX;
      const windY = baseBreezeY + gustY;

      for (const q of motes.current) {
        q.life++;

        q.vx += windX * 0.02;
        q.vy += windY * 0.01;
        q.vx += Math.sin(now * q.wobbleFreq + q.wobblePhase) * q.wobbleAmp * 0.014;

        if (gustActive) q.rotV += gustStrength * (Math.random() - 0.5) * 0.15;

        q.vx *= 0.988;
        q.vy *= 0.995;
        q.x += q.vx;
        q.y += q.vy;
        q.rot += q.rotV;

        if (q.y > h + 20 || q.life > q.max) {
          Object.assign(q, spawnCrystal(w, h));
        }
        if (q.x < -20) q.x = w + 20;
        if (q.x > w + 20) q.x = -20;

        const frac = q.life / q.max;
        const fade = frac < 0.08 ? frac / 0.08
                   : frac > 0.82 ? (1 - frac) / 0.18
                   : 1;
        const a = q.opacity * fade;
        if (a < 0.005) continue;

        ctx.globalAlpha = a;

        // Draw pre-rendered sprite (no shadowBlur / gradient per frame)
        if (q.kind === "dot") {
          const spr = pickSprite(sprites.dots, sprites.sizes, q.size);
          ctx.drawImage(spr, q.x - spr.width / 2, q.y - spr.height / 2);
        } else {
          const spr = q.kind === "flake"
            ? pickSprite(sprites.flakes, sprites.sizes, q.size)
            : pickSprite(sprites.shards, sprites.sizes, q.size);
          ctx.save();
          ctx.translate(q.x, q.y);
          ctx.rotate((q.rot * Math.PI) / 180);
          ctx.drawImage(spr, -spr.width / 2, -spr.height / 2);
          ctx.restore();
        }
      }

      ctx.globalAlpha = 1;
      rafId.current = requestAnimationFrame(tick);
    };

    rafId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId.current);
  }, []);

  return <canvas ref={cvs} className="frost-particles" aria-hidden="true" />;
}

/* ── Snowflake drawing (used once for sprite) ── */
function drawSnowflakeStatic(ctx: CanvasRenderingContext2D, r: number) {
  ctx.strokeStyle = "rgba(215, 240, 255, 1)";
  ctx.lineWidth = r * 0.28;
  ctx.lineCap = "round";

  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(cos * r, sin * r);
    ctx.stroke();

    const bx = cos * r * 0.6;
    const by = sin * r * 0.6;
    const bLen = r * 0.32;
    const a1 = angle + 0.55;
    const a2 = angle - 0.55;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + Math.cos(a1) * bLen, by + Math.sin(a1) * bLen);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + Math.cos(a2) * bLen, by + Math.sin(a2) * bLen);
    ctx.stroke();
  }
}

/* ── Ice shard drawing (used once for sprite) ── */
function drawShardStatic(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = "rgba(200, 235, 255, 1)";
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s * 0.3, 0);
  ctx.lineTo(0, s);
  ctx.lineTo(-s * 0.3, 0);
  ctx.closePath();
  ctx.fill();
}
