"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  /** The target value string, e.g. "30%", "$1B+", "$140K+", "0" */
  value: string;
  /** Animation duration in ms */
  duration?: number;
  /** CSS classes for the wrapper span */
  className?: string;
}

/**
 * Parses a display value like "$1B+", "15%", "$140K+", "30%", "0"
 * into { prefix, number, suffix } so only the numeric part animates.
 */
function parseValue(raw: string) {
  const match = raw.match(/^([^0-9]*)([0-9]+(?:\.[0-9]+)?)(.*)$/);
  if (!match) return { prefix: "", number: 0, suffix: raw, decimals: 0 };
  const numStr = match[2];
  const decimals = numStr.includes(".") ? numStr.split(".")[1].length : 0;
  return {
    prefix: match[1],
    number: parseFloat(numStr),
    suffix: match[3],
    decimals,
  };
}

export default function AnimatedCounter({
  value,
  duration = 2000,
  className = "",
}: AnimatedCounterProps) {
  const { prefix, number: target, suffix, decimals } = parseValue(value);
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
        }
      },
      { threshold: 0.3, rootMargin: "0px 0px -20px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasAnimated]);

  useEffect(() => {
    if (!hasAnimated || target === 0) return;

    const startTime = performance.now();

    function easeOutExpo(t: number) {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    let raf: number;
    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutExpo(progress);
      setCount(eased * target);

      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setCount(target);
      }
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hasAnimated, target, duration]);

  const display = hasAnimated
    ? `${prefix}${decimals > 0 ? count.toFixed(decimals) : Math.round(count)}${suffix}`
    : `${prefix}0${suffix}`;

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
