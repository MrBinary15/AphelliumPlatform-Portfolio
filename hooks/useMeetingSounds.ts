"use client";

/**
 * Lightweight Web Audio API sound effects for meetings.
 * No external audio files — everything is synthesised on the fly.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx || ctx.state === "closed") {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq: number, duration: number, gain: number, type: OscillatorType = "sine", delay = 0) {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(g);
    g.connect(c.destination);
    const t = c.currentTime + delay;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.02);
    g.gain.setValueAtTime(gain, t + duration - 0.05);
    g.gain.linearRampToValueAtTime(0, t + duration);
    osc.start(t);
    osc.stop(t + duration);
  } catch { /* AudioContext unavailable */ }
}

/** Pleasant ascending chime when someone joins */
export function playJoinSound() {
  tone(523, 0.12, 0.12, "sine", 0);
  tone(659, 0.12, 0.12, "sine", 0.1);
  tone(784, 0.18, 0.10, "sine", 0.2);
}

/** Descending tone when someone leaves */
export function playLeaveSound() {
  tone(784, 0.12, 0.10, "sine", 0);
  tone(659, 0.12, 0.10, "sine", 0.1);
  tone(440, 0.20, 0.08, "sine", 0.2);
}

/** Soft pop for new chat message */
export function playMessageSound() {
  tone(880, 0.06, 0.08, "sine", 0);
  tone(1047, 0.08, 0.06, "sine", 0.04);
}

/** Short bubbly for reactions */
export function playReactionSound() {
  tone(1200, 0.05, 0.06, "sine", 0);
  tone(1400, 0.05, 0.05, "sine", 0.04);
  tone(1600, 0.06, 0.04, "sine", 0.08);
}

/** Attention ding for hand raise */
export function playHandRaiseSound() {
  tone(880, 0.15, 0.10, "triangle", 0);
  tone(1320, 0.20, 0.08, "triangle", 0.12);
}

/** Short beep when call ends */
export function playCallEndSound() {
  tone(440, 0.25, 0.10, "sine", 0);
  tone(330, 0.35, 0.08, "sine", 0.25);
}

/** Outgoing ring — returns a stop function */
export function playOutgoingRing(): { stop: () => void } {
  let active = true;
  const ring = () => {
    if (!active) return;
    tone(440, 0.6, 0.12, "sine", 0);
    tone(480, 0.6, 0.12, "sine", 0);
    setTimeout(() => { if (active) ring(); }, 1600);
  };
  ring();
  return { stop: () => { active = false; } };
}

/** Incoming ring — returns a stop function */
export function playIncomingRing(): { stop: () => void } {
  let active = true;
  const ring = () => {
    if (!active) return;
    tone(523, 0.15, 0.14, "sine", 0);
    tone(659, 0.15, 0.14, "sine", 0.18);
    tone(523, 0.15, 0.14, "sine", 0.36);
    tone(659, 0.15, 0.14, "sine", 0.54);
    setTimeout(() => { if (active) ring(); }, 2000);
  };
  ring();
  return { stop: () => { active = false; } };
}

/** Screen share start notification */
export function playScreenShareSound() {
  tone(660, 0.08, 0.08, "square", 0);
  tone(880, 0.10, 0.06, "square", 0.06);
}
