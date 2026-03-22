"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function collectEditableElements(pathname: string): HTMLElement[] {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>("h1, h2, h3, h4, p"));
  const filtered = nodes.filter((el) => {
    if (el.closest("#admin-floating-panel")) return false;
    if (el.closest("[data-no-inline-edit='true']")) return false;
    return true;
  });

  const allowAutoKeys = pathname !== "/nosotros" && pathname !== "/";
  let autoIndex = 0;
  filtered.forEach((el) => {
    if (el.dataset.inlineEditKey && el.dataset.inlineEditKey.trim().length > 0) return;
    if (!allowAutoKeys) return;
    el.dataset.inlineEditKey = `${pathname}:${autoIndex}`;
    autoIndex += 1;
  });

  return filtered;
}

export default function InlineTextOverrides() {
  const pathname = usePathname();

  useEffect(() => {
    let active = true;

    const applyOverrides = async () => {
      const pagePath = pathname || "/";
      // Never override text on admin pages
      if (pagePath.startsWith("/admin")) return;
      const elements = collectEditableElements(pagePath);
      if (!elements.length) return;

      try {
        const res = await fetch(`/api/public/inline-overrides?path=${encodeURIComponent(pagePath)}`, { cache: "no-store" });
        if (!res.ok) return;
        const payload = (await res.json()) as { overrides?: Record<string, string> };
        const overrides = payload.overrides || {};
        if (!active) return;

        // Check if there are any actual overrides before touching the DOM
        const keys = Object.keys(overrides);
        if (!keys.length) return;

        elements.forEach((el) => {
          const key = el.dataset.inlineEditKey || "";
          if (key && overrides[key] !== undefined) {
            el.textContent = overrides[key];
          }
        });
      } catch {
        // Fail silently; inline overrides are optional enhancement.
      }
    };

    // Use requestIdleCallback so overrides apply only when the browser is idle,
    // avoiding visible layout shift during initial render.
    const scheduleId = typeof requestIdleCallback !== "undefined"
      ? requestIdleCallback(() => { void applyOverrides(); }, { timeout: 2000 })
      : window.setTimeout(() => { void applyOverrides(); }, 500);

    return () => {
      active = false;
      if (typeof cancelIdleCallback !== "undefined" && typeof requestIdleCallback !== "undefined") {
        cancelIdleCallback(scheduleId);
      } else {
        window.clearTimeout(scheduleId);
      }
    };
  }, [pathname]);

  return null;
}
