import { createClient } from "@/utils/supabase/server";
import { Mail, MapPin, Phone } from "lucide-react";
import ContactForm from "@/components/ContactForm";
import { getServerLanguage } from "@/utils/i18n";
import ScrollReveal from "@/components/ScrollReveal";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Contáctanos para consultas comerciales, soporte técnico o alianzas estratégicas con Aphellium.",
  openGraph: {
    title: "Contacto | Aphellium",
    description: "Ponte en contacto con el equipo de Aphellium.",
  },
};

export default async function ContactoPage() {
  const lang = await getServerLanguage();
  const supabase = await createClient();
  const { data: settings } = await supabase.from('site_settings').select('*');
  const settingsMap = settings?.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {} as Record<string, string>) || {};

  const contactEmail = settingsMap['contact_email'] || "info@aphellium.com";
  const contactAddress = settingsMap['contact_address'] || "Cantón Urcuquí, Imbabura\nEcuador";
  const contactPhone = settingsMap['contact_phone'] || "+593 (0) 99 999 9999";

  const t = lang === "en"
    ? {
        title: "Contact",
        titleHighlight: "Us",
        subtitle: "Ready to transform your logistics chain? Our team is here to help.",
        infoTitle: "Contact Information",
        infoText: "Whether for commercial inquiries, strategic partnerships, or technical support, our doors are open to build innovation-driven and sustainable connections.",
        location: "Main Location",
        email: "Email",
        phone: "Phone",
      }
    : {
        title: "Contáctate con",
        titleHighlight: "Nosotros",
        subtitle: "¿Listo para transformar tu cadena logística? Nuestro equipo está aquí para ayudarte.",
        infoTitle: "Información de Contacto",
        infoText: "Ya sea para consultas comerciales, alianzas estratégicas o soporte técnico, nuestras puertas están abiertas para establecer conexiones impulsadas por la innovación y la sostenibilidad.",
        location: "Ubicación Principal",
        email: "Correo Electrónico",
        phone: "Teléfono",
      };

  return (
    <main className="flex min-h-screen flex-col items-center">
      {/* Header */}
      <section className="relative w-full pt-28 md:pt-36 pb-16 md:pb-24 overflow-hidden bg-[var(--bg-darker)] section-mesh">
        <div className="glow-orb glow-orb-cyan w-[500px] h-[500px] -top-40 left-1/4 opacity-15" />
        <div className="glow-orb glow-orb-green w-[300px] h-[300px] bottom-0 right-1/4 opacity-10" />
        <div className="divider-glow absolute bottom-0 left-0 right-0" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <ScrollReveal>
            <span className="badge-premium mb-6 inline-flex">{lang === 'en' ? 'Get in Touch' : 'Hablemos'}</span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-5 tracking-tight hero-title-line">
              {t.title} <span className="text-gradient-animated">{t.titleHighlight}</span>
            </h1>
            <p className="hero-description text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
              {t.subtitle}
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Contact Content */}
      <section className="w-full py-16 md:py-24 pb-20 md:pb-32 relative section-noise">
        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
            
            {/* Contact Info */}
            <ScrollReveal direction="left" className="flex flex-col justify-center">
              <span className="badge-premium-green mb-4 inline-flex w-fit">{t.infoTitle}</span>
              <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">{t.infoTitle}</h2>
              <p className="text-gray-400 mb-8 sm:mb-12 text-base sm:text-lg leading-relaxed">
                {t.infoText}
              </p>

              <div className="space-y-4 sm:space-y-6">
                <div className="card-premium p-4 sm:p-6 flex items-start gap-3 sm:gap-4">
                  <div className="feature-icon feature-icon-cyan shrink-0">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-base sm:text-lg mb-1">{t.location}</h4>
                    <p className="text-gray-400 whitespace-pre-line">{contactAddress}</p>
                  </div>
                </div>

                <div className="card-premium-green p-4 sm:p-6 flex items-start gap-3 sm:gap-4">
                  <div className="feature-icon feature-icon-green shrink-0">
                    <Mail size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-base sm:text-lg mb-1">{t.email}</h4>
                    <a href={`mailto:${contactEmail}`} className="text-gray-400 hover:text-white transition-colors text-sm sm:text-base break-all">
                      {contactEmail}
                    </a>
                  </div>
                </div>

                <div className="card-premium p-4 sm:p-6 flex items-start gap-3 sm:gap-4">
                  <div className="feature-icon feature-icon-cyan shrink-0">
                    <Phone size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-base sm:text-lg mb-1">{t.phone}</h4>
                    <a href={`tel:${contactPhone}`} className="text-gray-400 hover:text-white transition-colors">
                      {contactPhone}
                    </a>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* Contact Form */}
            <ScrollReveal direction="right">
              <ContactForm />
            </ScrollReveal>
          </div>
        </div>
      </section>
    </main>
  );
}
