import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/server';
import { getServerLanguage } from '@/utils/i18n';

export default async function Footer() {
  const lang = await getServerLanguage();
  const supabase = await createClient();
  const { data: settings } = await supabase.from('site_settings').select('*');
  const settingsMap = settings?.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {} as Record<string, string>) || {};

  const contactEmail = settingsMap['contact_email'] || "invest@aphellium.com";
  const contactAddress = settingsMap['contact_address'] || "Cantón Urcuquí, Imbabura\nEcuador";
  const contactPhone = settingsMap['contact_phone'] || "";
  const socialLinkedin = settingsMap['social_linkedin'] || "";
  const socialTwitter = settingsMap['social_twitter'] || "";

  const t = lang === 'en'
    ? {
        tagline: 'Shaping the future of eco-friendly, highly profitable global trade.',
        navigation: 'Navigation',
        home: 'Home',
        about: 'About',
        projects: 'Projects',
        news: 'News',
        contactUs: 'Contact us',
        ready: 'Ready to revolutionize sustainable cooling?',
        joinVision: 'Join the Vision',
        goToContact: 'Go to Contact',
        rights: 'All rights reserved.',
      }
    : {
        tagline: 'Construyendo el futuro del comercio global ecológico y altamente rentable.',
        navigation: 'Navegación',
        home: 'Inicio',
        about: 'Nosotros',
        projects: 'Proyectos',
        news: 'Noticias',
        contactUs: 'Contáctanos',
        ready: '¿Listo para revolucionar la refrigeración sostenible?',
        joinVision: 'Únete a la Visión',
        goToContact: 'Ir a Contacto',
        rights: 'Todos los derechos reservados.',
      };

  return (
    <footer className="footer-premium pt-16 md:pt-24 pb-8 relative z-[1] overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/4 w-[40vw] h-[30vh] glow-orb glow-orb-cyan" />
      <div className="absolute bottom-0 right-1/4 w-[30vw] h-[20vh] glow-orb glow-orb-green" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 mb-12 md:mb-20">
          <div className="flex flex-col">
            <Link href="/" className="inline-flex items-center gap-2.5 no-underline mb-5 group">
              <Image 
                src="/assets/aphellium-logo-4.png" 
                alt="Aphellium Logo" 
                width={48} 
                height={48} 
                className="h-[36px] sm:h-[44px] w-auto object-contain transition-all duration-300 group-hover:drop-shadow-[0_0_12px_var(--accent-cyan)]"
              />
              <span className="font-bold text-xl sm:text-2xl tracking-[3px] text-[#f8fafc] uppercase">
                APHELLIUM
              </span>
            </Link>
            <p className="text-gray-400 text-sm max-w-xs mb-5 leading-relaxed">
              {t.tagline}
            </p>
            {/* Social Links if available */}
            <div className="flex gap-4">
              {socialLinkedin && (
                <a href={socialLinkedin} target="_blank" rel="noopener noreferrer" className="footer-link text-sm font-medium">
                  LinkedIn
                </a>
              )}
              {socialTwitter && (
                <a href={socialTwitter} target="_blank" rel="noopener noreferrer" className="footer-link text-sm font-medium">
                  Twitter
                </a>
              )}
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white/70 mb-5">{t.navigation}</h4>
            <ul className="flex flex-col gap-3">
              <li><Link href="/" className="footer-link text-sm">{t.home}</Link></li>
              <li><Link href="/nosotros" className="footer-link text-sm">{t.about}</Link></li>
              <li><Link href="/proyectos" className="footer-link text-sm">{t.projects}</Link></li>
              <li><Link href="/noticias-principal" className="footer-link text-sm">{t.news}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white/70 mb-5">{t.contactUs}</h4>
            <p className="text-gray-400 mb-3 text-sm leading-relaxed">{t.ready}</p>
            <a href={`mailto:${contactEmail}`} className="text-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]/80 transition-colors block mb-3 text-sm break-all">
              {contactEmail}
            </a>
            {contactPhone && (
              <p className="text-gray-400 text-sm mb-2">{contactPhone}</p>
            )}
            <p className="text-gray-500 text-sm whitespace-pre-line">
              {contactAddress}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white/70 mb-5">{t.joinVision}</h4>
            <div className="flex flex-col gap-3">
              <Link href="/contacto" className="btn-glow bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-green)] text-white font-bold px-6 py-3.5 rounded-xl text-center text-sm">
                {t.goToContact}
              </Link>
            </div>
          </div>
        </div>
        
        {/* Divider */}
        <div className="divider-gradient mb-6" />
        
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-gray-500 text-xs">
          <p>&copy; {new Date().getFullYear()} Aphellium Sustainable Technologies. {t.rights}</p>
          <p className="text-gray-600">Powered by innovation & sustainability</p>
        </div>
      </div>
    </footer>
  );
}
