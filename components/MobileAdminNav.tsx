"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Newspaper,
  FolderOpen,
  Mail,
  ClipboardList,
  Video,
  BarChart3,
  Headset,
  Bot,
  User as UserIcon,
  Users,
  Settings,
  LogOut,
  ExternalLink,
  MoreHorizontal,
  X,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

export default function MobileAdminNav({
  role,
  permissions,
}: {
  role: string;
  permissions: {
    viewMensajes: boolean;
    viewTasks: boolean;
    viewAllStats: boolean;
    manageUsers: boolean;
  };
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const isActive = (href: string) => pathname === href || (pathname ?? "").startsWith(href + "/");

  const primaryItems: NavItem[] = [
    { href: "/admin/dashboard", label: "Inicio", icon: <LayoutDashboard size={20} /> },
    { href: "/admin/noticias", label: "Noticias", icon: <Newspaper size={20} /> },
    { href: "/admin/proyectos", label: "Proyectos", icon: <FolderOpen size={20} /> },
    ...(permissions.viewMensajes
      ? [{ href: "/admin/mensajes", label: "Mensajes", icon: <Mail size={20} /> }]
      : []),
  ];

  const moreItems: NavItem[] = [
    ...(permissions.viewTasks
      ? [
          { href: "/admin/tareas", label: "Tareas", icon: <ClipboardList size={20} /> },
          { href: "/admin/reuniones", label: "Reuniones", icon: <Video size={20} /> },
        ]
      : []),
    ...(permissions.viewAllStats
      ? [{ href: "/admin/estadisticas", label: "Estadísticas", icon: <BarChart3 size={20} /> }]
      : []),
    ...(role === "admin"
      ? [
          { href: "/admin/soporte", label: "Soporte", icon: <Headset size={20} /> },
          { href: "/admin/documentos-ia", label: "Docs IA", icon: <Bot size={20} /> },
        ]
      : []),
    { href: "/admin/perfil", label: "Mi Perfil", icon: <UserIcon size={20} /> },
    ...(permissions.manageUsers
      ? [
          { href: "/admin/usuarios", label: "Usuarios", icon: <Users size={20} /> },
          { href: "/admin/configuracion", label: "Config", icon: <Settings size={20} /> },
        ]
      : []),
  ];

  const isMoreActive = moreItems.some((item) => isActive(item.href));

  return (
    <>
      {/* Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" />
      )}

      {/* Expanded menu panel */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] left-2 right-2 z-50 md:hidden animate-in slide-in-from-bottom-4 fade-in duration-200"
        >
          <div className="rounded-2xl border border-white/[0.08] bg-[#0a0f1c]/98 backdrop-blur-2xl shadow-2xl shadow-black/40 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.06]">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Más opciones</p>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Grid of items */}
            <div className="grid grid-cols-3 gap-1 p-3">
              {moreItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex flex-col items-center gap-1.5 py-3.5 px-2 rounded-xl transition-all active:scale-95 ${
                      active
                        ? "bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)]"
                        : "text-gray-400 hover:bg-white/[0.04] hover:text-white"
                    }`}
                  >
                    {item.icon}
                    <span className="text-[10px] font-medium leading-tight text-center">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Quick actions */}
            <div className="flex gap-2 p-3 pt-1 border-t border-white/[0.04]">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] font-medium text-gray-400 hover:text-white transition-colors"
              >
                <ExternalLink size={13} />
                Ver sitio
              </a>
              <form action="/auth/signout" method="post" className="flex-1">
                <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/[0.06] border border-red-500/10 text-[11px] font-medium text-red-400 hover:bg-red-500/15 transition-colors">
                  <LogOut size={13} />
                  Salir
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.08] bg-[#060a14]/95 backdrop-blur-xl supports-[padding:max(0px)]:pb-[max(env(safe-area-inset-bottom),0.25rem)]">
        <div className="flex justify-around px-2 py-1">
          {primaryItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 text-[10px] font-medium transition-all active:scale-95 ${
                  active
                    ? "text-[var(--accent-cyan)]"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <div className="relative">
                  {item.icon}
                  {active && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--accent-cyan)]" />
                  )}
                </div>
                <span className={active ? "font-semibold" : ""}>{item.label}</span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 text-[10px] font-medium transition-all active:scale-95 ${
              menuOpen || isMoreActive
                ? "text-[var(--accent-cyan)]"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <div className="relative">
              {menuOpen ? <X size={20} /> : <MoreHorizontal size={20} />}
              {isMoreActive && !menuOpen && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--accent-cyan)]" />
              )}
            </div>
            <span className={menuOpen || isMoreActive ? "font-semibold" : ""}>Más</span>
          </button>
        </div>
      </nav>
    </>
  );
}
