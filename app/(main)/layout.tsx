import { Suspense } from "react";
import Link from "next/link";
import { House, Users, Briefcase, Newspaper, MessageCircle, LogIn, LayoutDashboard } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import LazyFrostParticles from "@/components/LazyFrostParticles";
import { getServerLanguage } from "@/utils/i18n";
import { getAuthUser } from "@/utils/auth";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = await getServerLanguage();
  const auth = await getAuthUser();
  const mobileNav = lang === "en"
    ? [
        { href: "/", label: "Home", icon: House },
        { href: "/nosotros", label: "About", icon: Users },
        { href: "/proyectos", label: "Projects", icon: Briefcase },
        { href: "/noticias-principal", label: "News", icon: Newspaper },
        { href: "/contacto", label: "Contact", icon: MessageCircle },
        auth ? { href: "/admin/dashboard", label: "Portal", icon: LayoutDashboard } : { href: "/admin/login", label: "Sign in", icon: LogIn },
      ]
    : [
        { href: "/", label: "Inicio", icon: House },
        { href: "/nosotros", label: "Nosotros", icon: Users },
        { href: "/proyectos", label: "Proyectos", icon: Briefcase },
        { href: "/noticias-principal", label: "Noticias", icon: Newspaper },
        { href: "/contacto", label: "Contacto", icon: MessageCircle },
        auth ? { href: "/admin/dashboard", label: "Portal", icon: LayoutDashboard } : { href: "/admin/login", label: "Ingresar", icon: LogIn },
      ];

  return (
    <>
      <Suspense fallback={null}>
        <LazyFrostParticles />
      </Suspense>
      <a href="#main-content" className="sr-only focus:not-sr-only">
        {lang === "en" ? "Skip to content" : "Saltar al contenido"}
      </a>
      <Navbar />
      <div className="fixed top-16 md:top-24 right-3 sm:right-4 z-[52] md:z-[60]">
        <LanguageSwitcher />
      </div>
      <main id="main-content" className="min-h-screen relative z-[1] pb-20 md:pb-0" role="main" style={{ scrollbarGutter: "stable" }}>
        {children}
      </main>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[58] border-t border-white/10 bg-[rgba(2,6,14,0.96)] backdrop-blur-xl supports-[padding:max(0px)]:pb-[max(env(safe-area-inset-bottom),0.4rem)]">
        <div className="grid grid-cols-6 gap-1 px-2 py-2">
          {mobileNav.map((item) => (
            <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
              <item.icon size={16} />
              <span className="truncate max-w-[64px]">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
      <Footer />
    </>
  );
}
