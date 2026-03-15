import { createClient } from "@/utils/supabase/server";
import Image from "next/image";

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
  job_title: string;
  description: string;
  role: string;
}

export default async function NosotrosPage() {
  const supabase = await createClient();
  const { data: teamMembers } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, job_title, description, role")
    .returns<Profile[]>();

  return (
    <main className="flex min-h-screen flex-col items-center">
      {/* Header / Hero Nosotros */}
      <section className="relative w-full pt-32 pb-20 overflow-hidden bg-[var(--bg-darker)] border-b border-white/5">
        <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-[var(--accent-green)]/5 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
        <div className="container mx-auto px-4 text-center z-10">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
            Quiénes <span className="text-gradient">Somos</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Innovando en la cadena global de frío para proteger nuestro planeta y potenciar las exportaciones.
          </p>
        </div>
      </section>

      {/* Historia, Misión y Visión */}
      <section className="w-full py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Nuestra Historia</h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Aphellium nació de la necesidad de resolver uno de los mayores problemas
                del comercio internacional: la pérdida de valor y el enorme costo ambiental
                de la cadena de frío tradicional. Observando a los agroexportadores en Ecuador
                (especialmente en floricultura), identificamos que la refrigeración actual era
                insostenible y costosa.
              </p>
              <p className="text-gray-300 leading-relaxed">
                Reuniendo a expertos en nanotecnología y logística, desarrollamos el modelo APHE
                (Advanced Passive Hybrid Eco-cooler). Hoy, Aphellium no es solo tecnología de
                enfriamiento, es el estándar de un comercio global responsable, ético y trazable.
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-glass p-8 rounded-2xl border border-white/10 hover:border-[var(--accent-cyan)]/50 transition-colors">
                <h3 className="text-xl font-bold text-[var(--accent-cyan)] mb-3">Nuestra Misión</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Proporcionar tecnologías de enfriamiento pasivo altamente eficientes y sostenibles,
                  garantizando la integridad de los productos perecederos mientras reducimos
                  drásticamente la huella de carbono del comercio logístico internacional.
                </p>
              </div>
              
              <div className="bg-glass p-8 rounded-2xl border border-white/10 hover:border-[var(--accent-green)]/50 transition-colors">
                <h3 className="text-xl font-bold text-[var(--accent-green)] mb-3">Nuestra Visión</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Posicionarnos como el principal aliado tecnológico en América Latina y a nivel global
                  para la exportación carbono-neutral, erradicando la dependencia de la red eléctrica
                  convencional en las rutas de frío severas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Valores */}
      <section className="w-full py-20 bg-black/40 border-y border-white/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-12">Nuestros Valores</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            <div className="p-6">
              <div className="w-16 h-16 rounded-full bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] flex items-center justify-center mx-auto mb-4 text-2xl border border-[var(--accent-cyan)]/30">🌱</div>
              <h4 className="font-bold mb-2">Sostenibilidad</h4>
              <p className="text-sm text-gray-400">Responsabilidad ecológica en cada decisión de diseño.</p>
            </div>
            <div className="p-6">
              <div className="w-16 h-16 rounded-full bg-[var(--accent-green)]/10 text-[var(--accent-green)] flex items-center justify-center mx-auto mb-4 text-2xl border border-[var(--accent-green)]/30">⚙️</div>
              <h4 className="font-bold mb-2">Innovación</h4>
              <p className="text-sm text-gray-400">Pioneros en unir nanotecnología y telemetría blockchain.</p>
            </div>
            <div className="p-6">
              <div className="w-16 h-16 rounded-full bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] flex items-center justify-center mx-auto mb-4 text-2xl border border-[var(--accent-cyan)]/30">🤝</div>
              <h4 className="font-bold mb-2">Transparencia</h4>
              <p className="text-sm text-gray-400">Datos inmutables para la tranquilidad de nuestros clientes.</p>
            </div>
            <div className="p-6">
              <div className="w-16 h-16 rounded-full bg-[var(--accent-green)]/10 text-[var(--accent-green)] flex items-center justify-center mx-auto mb-4 text-2xl border border-[var(--accent-green)]/30">⭐</div>
              <h4 className="font-bold mb-2">Excelencia</h4>
              <p className="text-sm text-gray-400">Nos exigimos cumplir los más altos estándares ISO.</p>
            </div>
          </div>
        </div>
      </section>

      {/* El Equipo */}
      <section className="w-full py-20 pb-32">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Nuestro Equipo</h2>
          <p className="text-gray-400 mb-12 max-w-2xl mx-auto">
            Conoce a los expertos en refrigeración, inteligencia artificial comercialización detrás de la red de frío de Aphellium.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {teamMembers && teamMembers.length > 0 ? (
              teamMembers.map((member) => (
                <div key={member.id} className="bg-glass rounded-2xl overflow-hidden border border-white/5 hover:-translate-y-2 transition-transform duration-300">
                  <div className="h-64 bg-gray-800 w-full flex items-center justify-center relative overflow-hidden">
                    {member.avatar_url ? (
                      <Image 
                        src={member.avatar_url}
                        alt={member.full_name || "Miembro del equipo"}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <span className="text-6xl opacity-20">👤</span>
                    )}
                  </div>
                  <div className="p-6 text-left flex flex-col items-start h-full">
                    <h4 className="font-bold text-xl">{member.full_name || "Usuario"}</h4>
                    <p className="text-[var(--accent-cyan)] text-sm mb-4 font-medium">{member.job_title || (member.role === 'admin' ? 'Administrador' : 'Empleado')}</p>
                    <p className="text-sm text-gray-400">
                      {member.description || "Parte esencial de nuestro equipo en Aphellium."}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-gray-500">
                Aún no hay perfiles de equipo registrados.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
