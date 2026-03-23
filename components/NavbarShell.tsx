"use client";
import { useState, useEffect } from "react";

export default function NavbarShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 w-full z-[120] navbar-premium transition-all duration-300 ${
        scrolled
          ? "navbar-scrolled py-2 md:py-3"
          : "py-3 md:py-6 bg-transparent"
      }`}
    >
      {children}
    </header>
  );
}
