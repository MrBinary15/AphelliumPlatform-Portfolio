import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: settings } = await supabase.from('site_settings').select('*');
  const settingsMap = settings?.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {} as Record<string, string>) || {};

  const heroTitle = settingsMap['hero_title'] || "Sustainable Cooling for Ecuador's Floriculture";
  const heroDescription = settingsMap['hero_description'] || "An Advanced Passive Hybrid Eco-cooler (APHE) integrating nanotechnology, AI, and blockchain to reduce energy costs by 30%, eliminate cool breaks, and guarantee ISO 14064 & 14067 compliance.";

  // Fancy rendering for the title (make the last two words gradient if possible)
  const titleWords = heroTitle.split(' ');
  const lastWords = titleWords.length > 2 ? titleWords.splice(-2).join(' ') : '';
  const firstPart = titleWords.join(' ');

  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      {/* Hero Section */}
      <section className="relative w-full min-h-screen flex items-center justify-center pt-24 pb-12 overflow-hidden">
        {/* Glow effect from original design */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-[var(--accent-cyan)]/5 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
        
        <div className="container mx-auto px-4 z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col items-start text-left">
            <div className="inline-block px-4 py-1.5 rounded-full border border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] font-medium text-sm mb-6 uppercase tracking-wider">
              Eco-Friendly Global Trade
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight tracking-tight text-white">
              {firstPart} {lastWords && <><br/><span className="text-gradient">{lastWords}</span></>}
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-xl leading-relaxed">
              {heroDescription}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link href="/tecnologia" className="bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/90 text-white font-semibold px-8 py-4 rounded-lg transition-transform hover:-translate-y-1 shadow-[0_4px_20px_var(--accent-cyan-glow)] text-center">
                Ver Catálogo (Tecnología)
              </Link>
              <Link href="/contacto" className="bg-transparent border border-white/20 hover:border-white text-white font-semibold px-8 py-4 rounded-lg transition-transform hover:-translate-y-1 text-center bg-glass">
                Contáctanos
              </Link>
            </div>
            
            {/* Value Proposition / Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/10 w-full">
              <div>
                <div className="text-3xl font-bold text-white mb-1">30%</div>
                <div className="text-sm text-gray-400 uppercase tracking-wider">Ahorro Energía</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white mb-1">$150M</div>
                <div className="text-sm text-gray-400 uppercase tracking-wider">Flujo Logístico</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white mb-1">Cero</div>
                <div className="text-sm text-gray-400 uppercase tracking-wider">Carga de Red</div>
              </div>
            </div>
          </div>
          
          <div className="relative">
            {/* Dashboard Mockup (Visual Proof) */}
            <div className="bg-glass rounded-2xl p-6 border border-white/10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-green)]"></div>
              
              <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-6">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--accent-cyan)]">
                  <span className="w-2 h-2 rounded-full bg-[var(--accent-cyan)] animate-pulse"></span>
                  AI Environmental Monitoring
                </div>
                <div className="text-xs text-gray-400 font-mono bg-white/5 px-2 py-1 rounded">
                  Batch: #FLW-89X
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                  <div className="text-xs text-gray-400 uppercase mb-2">Temp. Interna</div>
                  <div className="text-3xl font-bold text-white mb-1">2.4°C</div>
                  <div className="text-xs text-[var(--accent-green)] mt-2 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Óptimo
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                  <div className="text-xs text-gray-400 uppercase mb-2">Compensación CO₂</div>
                  <div className="text-3xl font-bold text-white mb-1">4.2 T</div>
                  <div className="text-xs text-[var(--accent-cyan)] mt-2 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    Acreditado
                  </div>
                </div>
              </div>
              
              <div className="mt-4 bg-white/5 rounded-xl p-4 border border-white/5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-400 uppercase">Integridad de Cadena de Frío</span>
                  <span className="text-xs font-bold text-white">100%</span>
                </div>
                <div className="w-full bg-black/50 rounded-full h-1.5">
                  <div className="bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-green)] h-1.5 rounded-full w-full"></div>
                </div>
              </div>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute -top-10 -right-10 w-20 h-20 rounded-full border border-[var(--accent-cyan)]/30 animate-[spin_10s_linear_infinite]"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full border border-[var(--accent-green)]/20 animate-[spin_15s_linear_infinite_reverse]"></div>
          </div>
        </div>
      </section>
      
      {/* Social Proof Section */}
      <section className="w-full py-16 bg-black/30 border-y border-white/5">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-gray-400 uppercase tracking-widest mb-8">Diseñado para la industria global de flores de exportación</p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Logos representativos genéricos o reales si los tuvieran */}
            <div className="text-2xl font-bold font-serif">Expoflores</div>
            <div className="text-xl font-bold tracking-tighter">BPM Cargo</div>
            <div className="text-2xl font-bold">AeroRoute</div>
            <div className="text-2xl font-black italic">GLOBAL G.A.P.</div>
          </div>
        </div>
      </section>
    </main>
  );
}
