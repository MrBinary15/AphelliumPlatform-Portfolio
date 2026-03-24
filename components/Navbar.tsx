import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/server';
import { LogIn, LayoutDashboard } from 'lucide-react';
import { getServerLanguage } from '@/utils/i18n';
import MobileNav from './MobileNav';
import NavbarShell from './NavbarShell';

export default async function Navbar() {
  const lang = await getServerLanguage();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const t = lang === 'en'
    ? {
        home: 'Home',
        about: 'About',
        projects: 'Projects',
        news: 'News',
        contact: 'Contact',
        login: 'Sign in',
        portal: 'Portal',
      }
    : {
        home: 'Inicio',
        about: 'Nosotros',
        projects: 'Proyectos',
        news: 'Noticias',
        contact: 'Contacto',
        login: 'Iniciar Sesión',
        portal: 'Portal',
      };

  // Fetch profile for Avatar if logged in
  let profile: { full_name: string | null; avatar_url: string | null } | null = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single();
    profile = data;
  }

  return (
    <NavbarShell>
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link href="/" className="inline-flex items-center no-underline group">
          <Image 
            src="/assets/aphellium-logo-3.png" 
            alt="Aphellium — Passive Cooling" 
            width={160} 
            height={94} 
            className="h-[38px] md:h-[48px] w-auto object-contain drop-shadow-[0_0_5px_rgba(255,255,255,0.1)] transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-[0_0_16px_var(--accent-cyan)] brightness-0 invert"
            priority
          />
        </Link>
        <nav className="hidden md:flex gap-7 items-center">
          <Link href="/" className="nav-link-premium text-sm">{t.home}</Link>
          <Link href="/nosotros" className="nav-link-premium text-sm">{t.about}</Link>
          <Link href="/proyectos" className="nav-link-premium text-sm">{t.projects}</Link>
          <Link href="/noticias-principal" className="nav-link-premium text-sm">{t.news}</Link>
          <Link href="/contacto" className="btn-glass px-5 py-2 rounded-full text-[var(--accent-cyan)] font-semibold text-sm hover:border-[var(--accent-cyan)]/40 hover:text-white hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]">
            {t.contact}
          </Link>

          {/* Auth Button */}
          {user ? (
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/25 text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/20 hover:border-[var(--accent-cyan)]/40 hover:shadow-[0_0_24px_rgba(6,182,212,0.12)] transition-all duration-300 text-sm font-semibold"
            >
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt="Avatar"
                  width={24}
                  height={24}
                  className="rounded-full object-cover ring-1 ring-[var(--accent-cyan)]/30"
                />
              ) : (
                <LayoutDashboard size={16} />
              )}
              <span>{profile?.full_name?.split(' ')[0] ?? t.portal}</span>
            </Link>
          ) : (
            <Link
              href="/admin/login"
              className="btn-glass flex items-center gap-2 px-4 py-2 rounded-full text-gray-300 hover:text-white text-sm font-medium"
            >
              <LogIn size={16} />
              <span>{t.login}</span>
            </Link>
          )}
        </nav>

        {/* Mobile menu */}
        <MobileNav
          links={[
            { href: '/', label: t.home },
            { href: '/nosotros', label: t.about },
            { href: '/proyectos', label: t.projects },
            { href: '/noticias-principal', label: t.news },
          ]}
          contactLabel={t.contact}
          user={user ? { name: profile?.full_name?.split(' ')[0] ?? null, avatarUrl: profile?.avatar_url ?? null } : null}
          loginLabel={t.login}
          portalLabel={t.portal}
        />
      </div>
    </NavbarShell>
  );
}
