"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function collectEditableElements(pathname: string): HTMLElement[] {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>("h1, h2, h3, h4, p, button, a, li, span"));
  const filtered = nodes.filter((el) => {
    if (el.closest("#admin-floating-panel")) return false;
    if (el.closest("[data-no-inline-edit='true']")) return false;
    // Skip elements with no meaningful text or only whitespace
    const text = (el.textContent || "").trim();
    if (!text || text.length < 2) return false;
    // Skip elements whose text is entirely from child elements already in the list
    // (e.g. a <button> containing a <span> — keep the deepest text node)
    if ((el.tagName === "SPAN" || el.tagName === "A" || el.tagName === "BUTTON") && el.children.length > 0) {
      const childText = Array.from(el.children)
        .map((c) => (c.textContent || "").trim())
        .join("");
      if (childText === text) return false;
    }
    return true;
  });

  // Only apply overrides to elements with explicit data-inline-edit-key.
  // Skip auto-indexing: it causes misalignment when the DOM changes.
  return filtered.filter((el) => {
    const key = (el.dataset.inlineEditKey || "").trim();
    return key.length > 0;
  });
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
