"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, LogIn, LayoutDashboard } from "lucide-react";

interface MobileNavProps {
  links: { href: string; label: string }[];
  contactLabel: string;
  user: { name: string | null; avatarUrl: string | null } | null;
  loginLabel: string;
  portalLabel: string;
}

export default function MobileNav({ links, contactLabel, user, loginLabel, portalLabel }: MobileNavProps) {
  const [open, setOpen] = useState(false);

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
        className="relative z-[60] p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-out panel */}
      <nav
        className={`fixed top-0 right-0 z-[56] h-full w-[75vw] max-w-[320px] bg-[var(--bg-dark)]/95 backdrop-blur-xl border-l border-white/10 transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full pt-20 pb-8 px-6 overflow-y-auto">
          <div className="flex flex-col gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-base font-medium text-gray-200 hover:text-[var(--accent-cyan)] transition-colors py-3 border-b border-white/5"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/contacto"
              onClick={() => setOpen(false)}
              className="px-5 py-3 rounded-xl border border-[var(--accent-cyan)] text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)] hover:text-white transition-all text-center font-semibold"
            >
              {contactLabel}
            </Link>

            {user ? (
              <Link
                href="/admin/dashboard"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/20 transition-all font-semibold"
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
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:border-white/30 hover:bg-white/10 transition-all font-medium"
              >
                <LogIn size={18} />
                <span>{loginLabel}</span>
              </Link>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}
