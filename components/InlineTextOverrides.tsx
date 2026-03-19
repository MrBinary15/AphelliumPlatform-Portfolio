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
      const elements = collectEditableElements(pagePath);
      if (!elements.length) return;

      try {
        const res = await fetch(`/api/public/inline-overrides?path=${encodeURIComponent(pagePath)}`, { cache: "no-store" });
        if (!res.ok) return;
        const payload = (await res.json()) as { overrides?: Record<string, string> };
        const overrides = payload.overrides || {};
        if (!active) return;

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

    // Delay until hydration/layout settles so node order is stable.
    const timer = window.setTimeout(() => {
      void applyOverrides();
    }, 120);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [pathname]);

  return null;
}
