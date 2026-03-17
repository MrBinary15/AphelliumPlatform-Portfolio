import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/server';
import { LogIn, LayoutDashboard } from 'lucide-react';
import { getServerLanguage } from '@/utils/i18n';
import MobileNav from './MobileNav';

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
    <header className="fixed top-0 left-0 w-full py-3 md:py-6 z-50 bg-black/40 backdrop-blur-md border-b border-white/10 transition-all">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link href="/" className="inline-flex items-center gap-2 no-underline group">
          <Image 
            src="/assets/aphellium-logo-4.png" 
            alt="Aphellium Logo" 
            width={38} 
            height={38} 
            className="h-[30px] md:h-[38px] w-auto object-contain drop-shadow-[0_0_5px_rgba(255,255,255,0.1)] transition-all group-hover:scale-105 group-hover:drop-shadow-[0_0_12px_var(--accent-cyan)]"
          />
          <span className="font-bold text-lg md:text-[1.5rem] tracking-[2px] text-[#f8fafc] uppercase transition-all group-hover:text-[var(--accent-cyan)] group-hover:drop-shadow-[0_0_10px_var(--accent-cyan-glow)]">
            APHELLIUM
          </span>
        </Link>
        <nav className="hidden md:flex gap-8 items-center">
          <Link href="/" className="text-sm font-medium hover:text-[var(--accent-cyan)] transition-colors">{t.home}</Link>
          <Link href="/nosotros" className="text-sm font-medium hover:text-[var(--accent-cyan)] transition-colors">{t.about}</Link>
          <Link href="/proyectos" className="text-sm font-medium hover:text-[var(--accent-cyan)] transition-colors">{t.projects}</Link>
          <Link href="/noticias-principal" className="text-sm font-medium hover:text-[var(--accent-cyan)] transition-colors">{t.news}</Link>
          <Link href="/contacto" className="px-5 py-2 rounded-full border border-[var(--accent-cyan)] text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)] hover:text-white transition-all">
            {t.contact}
          </Link>

          {/* Auth Button */}
          {user ? (
            // Already logged in → show Portal button with avatar
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/20 transition-all text-sm font-semibold"
            >
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt="Avatar"
                  width={24}
                  height={24}
                  className="rounded-full object-cover"
                />
              ) : (
                <LayoutDashboard size={16} />
              )}
              <span>{profile?.full_name?.split(' ')[0] ?? t.portal}</span>
            </Link>
          ) : (
            // Not logged in → show Login button
            <Link
              href="/admin/login"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:border-white/30 hover:bg-white/10 transition-all text-sm font-medium"
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
    </header>
  );
}
