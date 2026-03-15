import { createClient } from "@/utils/supabase/server";
import { Mail, MapPin, Phone } from "lucide-react";
import ContactForm from "@/components/ContactForm";

export default async function ContactoPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase.from('site_settings').select('*');
  const settingsMap = settings?.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {} as Record<string, string>) || {};

  const contactEmail = settingsMap['contact_email'] || "info@aphellium.com";
  const contactAddress = settingsMap['contact_address'] || "Cantón Urcuquí, Imbabura\nEcuador";
  const contactPhone = settingsMap['contact_phone'] || "+593 (0) 99 999 9999";

  return (
    <main className="flex min-h-screen flex-col items-center">
      {/* Header */}
      <section className="relative w-full pt-32 pb-20 overflow-hidden bg-[var(--bg-darker)] border-b border-white/5">
        <div className="absolute top-0 left-1/4 w-[30vw] h-[30vw] bg-[var(--accent-cyan)]/5 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
        <div className="container mx-auto px-4 text-center z-10">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
            Contáctate con <span className="text-gradient">Nosotros</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            ¿Listo para transformar tu cadena logística? Nuestro equipo está aquí para ayudarte.
          </p>
        </div>
      </section>

      {/* Contact Content */}
      <section className="w-full py-20 pb-32">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            
            {/* Contact Info */}
            <div className="flex flex-col justify-center">
              <h2 className="text-3xl font-bold mb-8">Información de Contacto</h2>
              <p className="text-gray-400 mb-12 text-lg leading-relaxed">
                Ya sea para consultas comerciales, alianzas estratégicas o soporte técnico,
                nuestras puertas están abiertas para establecer conexiones impulsadas por la innovación y la sostenibilidad.
              </p>

              <div className="space-y-8">
                <div className="flex items-start gap-4 p-6 bg-glass rounded-2xl border border-white/5 hover:border-[var(--accent-cyan)]/30 transition-colors">
                  <div className="p-3 bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] rounded-xl shrink-0">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">Ubicación Principal</h4>
                    <p className="text-gray-400 whitespace-pre-line">{contactAddress}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-6 bg-glass rounded-2xl border border-white/5 hover:border-[var(--accent-green)]/30 transition-colors">
                  <div className="p-3 bg-[var(--accent-green)]/10 text-[var(--accent-green)] rounded-xl shrink-0">
                    <Mail size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">Correo Electrónico</h4>
                    <a href={`mailto:${contactEmail}`} className="text-gray-400 hover:text-white transition-colors">
                      {contactEmail}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-6 bg-glass rounded-2xl border border-white/5 hover:border-[var(--accent-cyan)]/30 transition-colors">
                  <div className="p-3 bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] rounded-xl shrink-0">
                    <Phone size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">Teléfono</h4>
                    <a href={`tel:${contactPhone}`} className="text-gray-400 hover:text-white transition-colors">
                      {contactPhone}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <ContactForm />
          </div>
        </div>
      </section>
    </main>
  );
}
