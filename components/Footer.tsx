import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/server';

export default async function Footer() {
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

  return (
    <footer className="border-t border-white/10 pt-20 pb-8 bg-[var(--bg-darker)]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="flex flex-col">
            <Link href="/" className="inline-flex items-center gap-2 no-underline mb-6">
              <Image 
                src="/assets/aphellium-logo-4.png" 
                alt="Aphellium Logo" 
                width={48} 
                height={48} 
                className="h-[48px] w-auto object-contain"
              />
              <span className="font-bold text-[1.8rem] tracking-[2px] text-[#f8fafc] uppercase">
                APHELLIUM
              </span>
            </Link>
            <p className="text-gray-400 text-sm max-w-xs mb-4">
              Shaping the future of eco-friendly, highly profitable global trade.
            </p>
            {/* Social Links if available */}
            <div className="flex gap-4">
              {socialLinkedin && (
                <a href={socialLinkedin} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--accent-cyan)] transition-colors">
                  LinkedIn
                </a>
              )}
              {socialTwitter && (
                <a href={socialTwitter} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--accent-cyan)] transition-colors">
                  Twitter
                </a>
              )}
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-6">Navegación</h4>
            <ul className="flex flex-col gap-3">
              <li><Link href="/" className="text-gray-400 hover:text-white transition-colors">Inicio</Link></li>
              <li><Link href="/nosotros" className="text-gray-400 hover:text-white transition-colors">Nosotros</Link></li>
              <li><Link href="/proyectos" className="text-gray-400 hover:text-white transition-colors">Proyectos</Link></li>
              <li><Link href="/noticias-principal" className="text-gray-400 hover:text-white transition-colors">Noticias</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-6">Contáctanos</h4>
            <p className="text-gray-400 mb-2">Ready to revolutionize sustainable cooling?</p>
            <a href={`mailto:${contactEmail}`} className="text-[var(--accent-cyan)] hover:underline block mb-4">
              {contactEmail}
            </a>
            {contactPhone && (
              <p className="text-gray-400 text-sm mb-2">{contactPhone}</p>
            )}
            <p className="text-gray-400 text-sm whitespace-pre-line">
              {contactAddress}
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-6">Únete a la Visión</h4>
            <div className="flex flex-col gap-2">
              <Link href="/contacto" className="bg-[var(--accent-cyan)] text-white px-6 py-3 rounded-md text-center hover:bg-[var(--accent-cyan)]/80 transition-colors">
                Ir a Contacto
              </Link>
            </div>
          </div>
        </div>
        
        <div className="pt-8 border-t border-white/10 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} Aphellium Sustainable Technologies. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
