"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, LogIn, LayoutDashboard } from "lucide-react";
import { createPortal } from "react-dom";

interface MobileNavProps {
  links: { href: string; label: string }[];
  contactLabel: string;
  user: { name: string | null; avatarUrl: string | null } | null;
  loginLabel: string;
  portalLabel: string;
}

export default function MobileNav({ links, contactLabel, user, loginLabel, portalLabel }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close menu on route change (clicks) and prevent body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="md:hidden">
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative z-[10000] p-2 rounded-xl text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>

      {mounted && createPortal(
        <>
          {/* Overlay */}
          {open && (
            <div
              className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
          )}

          {/* Slide-out panel */}
          <nav
            className={`fixed inset-0 z-[9999] bg-[rgba(2,6,14,0.98)] backdrop-blur-xl transition-all duration-300 ease-out ${
              open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="flex flex-col h-full pt-20 pb-8 px-5 overflow-y-auto">
              <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-gray-400 mb-2">Navegacion</p>
                <div className="grid grid-cols-1 gap-1">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="text-base font-medium text-gray-100 hover:text-[var(--accent-cyan)] hover:bg-white/10 transition-colors py-3 px-3 rounded-xl"
                  >
                    {link.label}
                  </Link>
                ))}
                </div>
              </div>

              <div className="mt-1 flex flex-col gap-3">
                <Link
                  href="/contacto"
                  onClick={() => setOpen(false)}
                  className="px-5 py-3.5 rounded-xl border border-[var(--accent-cyan)] text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)] hover:text-white transition-all text-center font-semibold"
                >
                  {contactLabel}
                </Link>

                {user ? (
                  <Link
                    href="/admin/dashboard"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/20 transition-all font-semibold"
                  >
                    {user.avatarUrl ? (
                      <Image src={user.avatarUrl} alt="Avatar" width={24} height={24} className="rounded-full object-cover" />
                    ) : (
                      <LayoutDashboard size={18} />
                    )}
                    <span>{user.name ?? portalLabel}</span>
                  </Link>
                ) : (
                  <Link
                    href="/admin/login"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:border-white/30 hover:bg-white/10 transition-all font-medium"
                  >
                    <LogIn size={18} />
                    <span>{loginLabel}</span>
                  </Link>
                )}
              </div>

              <div className="mt-auto pt-6 text-center text-xs text-gray-500">APHELLIUM Mobile</div>
            </div>
          </nav>
        </>,
        document.body
      )}
    </div>
  );
}
