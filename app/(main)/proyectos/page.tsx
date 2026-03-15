export default function ProyectosPage() {
  return (
    <main className="flex min-h-screen flex-col items-center">
      {/* Header */}
      <section className="relative w-full pt-32 pb-20 overflow-hidden bg-[var(--bg-darker)] border-b border-white/5">
        <div className="absolute top-0 left-0 w-[50vw] h-[50vw] bg-[var(--accent-cyan)]/5 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
        <div className="container mx-auto px-4 text-center z-10">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
            Nuestros <span className="text-gradient">Proyectos</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Innovación comprobada en el mundo real. Casos de éxito que transforman la cadena de frío global.
          </p>
        </div>
      </section>

      {/* Casos de Éxito / Gallery */}
      <section className="w-full py-20 pb-32">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            
            {/* Proyecto 1 */}
            <div className="group rounded-3xl overflow-hidden bg-glass border border-white/5 hover:border-[var(--accent-cyan)]/30 transition-all duration-300">
              <div className="relative h-72 bg-gray-900 w-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-dark)] to-transparent z-10"></div>
                {/* Fallback pattern */}
                <div className="absolute inset-0 opacity-10 flex items-center justify-center text-8xl">🌹</div>
              </div>
              <div className="p-8 relative z-20 -mt-16">
                <div className="inline-block px-3 py-1 bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] rounded-full text-xs font-bold tracking-wider mb-4 border border-[var(--accent-cyan)]/30 backdrop-blur-md">
                  FLORICULTURA
                </div>
                <h3 className="text-2xl font-bold mb-3">Exportación ECU-MIA Cero Emisiones</h3>
                <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                  Implementación del modelo APHE en la ruta Quito - Miami. Resultados: 100% de la carga mantenida en rango térmico óptimo. Reducción del 85% de huella de carbono logística vs. contenedores activos tradicionales.
                </p>
                <div className="flex gap-4 border-t border-white/10 pt-4">
                  <div>
                    <span className="block text-xl font-bold text-white">0%</span>
                    <span className="text-xs text-gray-500">Mermas Térmicas</span>
                  </div>
                  <div>
                    <span className="block text-xl font-bold text-[var(--accent-green)]">14h</span>
                    <span className="text-xs text-gray-500">Autonomía Pasiva</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Proyecto 2 */}
            <div className="group rounded-3xl overflow-hidden bg-glass border border-white/5 hover:border-[var(--accent-green)]/30 transition-all duration-300">
               <div className="relative h-72 bg-gray-900 w-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-dark)] to-transparent z-10"></div>
                {/* Fallback pattern */}
                <div className="absolute inset-0 opacity-10 flex items-center justify-center text-8xl">🥭</div>
              </div>
              <div className="p-8 relative z-20 -mt-16">
                <div className="inline-block px-3 py-1 bg-[var(--accent-green)]/20 text-[var(--accent-green)] rounded-full text-xs font-bold tracking-wider mb-4 border border-[var(--accent-green)]/30 backdrop-blur-md">
                  AGRO EXPORTACIÓN
                </div>
                <h3 className="text-2xl font-bold mb-3">Programa de Resiliencia Frutícola</h3>
                <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                  Protección de frutas exóticas (Pitahaya y Mango) en tránsitos marítimos prolongados y conexiones deficientes en puertos de transbordo, utilizando tecnología APHE.
                </p>
                <div className="flex gap-4 border-t border-white/10 pt-4">
                  <div>
                    <span className="block text-xl font-bold text-white">+5</span>
                    <span className="text-xs text-gray-500">Días de Vida Útil</span>
                  </div>
                  <div>
                     <span className="block text-xl font-bold text-[var(--accent-cyan)]">$0</span>
                    <span className="text-xs text-gray-500">Consumo Energético</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
          
           <div className="mt-20 text-center">
            <h3 className="text-2xl font-bold mb-8">Galería de Operaciones</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="aspect-square bg-gray-800 rounded-2xl overflow-hidden border border-white/5 hover:border-white/20 transition-all duration-300 hover:scale-105 flex items-center justify-center group">
                 <span className="opacity-20 text-4xl group-hover:opacity-40 transition-opacity">📸</span>
              </div>
              <div className="aspect-square bg-gray-800 rounded-2xl overflow-hidden border border-white/5 hover:border-white/20 transition-all duration-300 hover:scale-105 flex items-center justify-center group">
                 <span className="opacity-20 text-4xl group-hover:opacity-40 transition-opacity">📸</span>
              </div>
              <div className="aspect-square bg-gray-800 rounded-2xl overflow-hidden border border-white/5 hover:border-white/20 transition-all duration-300 hover:scale-105 flex items-center justify-center group">
                 <span className="opacity-20 text-4xl group-hover:opacity-40 transition-opacity">📸</span>
              </div>
              <div className="aspect-square bg-gray-800 rounded-2xl overflow-hidden border border-white/5 hover:border-white/20 transition-all duration-300 hover:scale-105 flex items-center justify-center group">
                 <span className="opacity-20 text-4xl group-hover:opacity-40 transition-opacity">📸</span>
              </div>
            </div>
            <div className="mt-12 p-6 rounded-2xl bg-glass border border-white/5 max-w-2xl mx-auto">
              <p className="text-sm text-gray-400 italic mb-2">
                &quot;La tecnología pasiva es el futuro. Redujimos nuestros reclamos por cortes de frío a cero en el último trimestre.&quot;
              </p>
              <p className="text-xs text-[var(--accent-cyan)] font-bold uppercase tracking-widest">— Cliente del sector agroexportador</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
