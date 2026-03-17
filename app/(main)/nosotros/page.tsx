import { createClient } from "@/utils/supabase/server";
import { getServerLanguage } from "@/utils/i18n";
import TeamMembersRealtime from "@/components/TeamMembersRealtime";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nosotros",
  description: "Conoce al equipo de Aphellium Sustainable Technologies. Misión, visión y valores de innovación sostenible.",
  openGraph: {
    title: "Sobre Nosotros | Aphellium",
    description: "Equipo, misión y visión de Aphellium Sustainable Technologies.",
  },
};

export const dynamic = "force-dynamic";

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
  job_title: string;
  description: string;
  role: string;
}

export default async function NosotrosPage() {
  const lang = await getServerLanguage();
  const supabase = await createClient();
  const { data: teamMembersRaw } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, job_title, description, role")
    .not("role", "eq", "visitante")
    .order("full_name", { ascending: true })
    .returns<Profile[]>();

  const teamMembers = (teamMembersRaw || []).filter((member) => {
    const hasName = !!member.full_name?.trim();
    const hasRole = !!member.job_title?.trim();
    const hasDescription = !!member.description?.trim();
    return hasName || hasRole || hasDescription;
  });

  const t = lang === "en"
    ? {
        title: "Who We Are",
        subtitle: "Innovating in the global cold chain to protect our planet and empower exports.",
        story: "Our Story",
        storyP1: "Aphellium was born from the need to solve one of international trade's biggest challenges: value loss and the environmental cost of traditional cold chains. While working with Ecuadorian agro-exporters (especially floriculture), we identified that existing refrigeration was expensive and unsustainable.",
        storyP2: "By bringing together experts in nanotechnology and logistics, we developed the APHE model (Advanced Passive Hybrid Eco-cooler). Today, Aphellium is not only cooling technology; it is the benchmark for responsible, ethical, and traceable global trade.",
        mission: "Our Mission",
        missionText: "Provide highly efficient and sustainable passive cooling technologies, preserving the integrity of perishable products while drastically reducing the carbon footprint of international logistics.",
        vision: "Our Vision",
        visionText: "Position ourselves as the leading technology partner in Latin America and globally for carbon-neutral exports, eliminating dependency on conventional power grids in severe cold-chain routes.",
        values: "Our Values",
        team: "Our Team",
        teamSubtitle: "Meet the refrigeration, AI and commercialization experts behind Aphellium's cold chain network.",
        sustainability: "Sustainability",
        innovation: "Innovation",
        transparency: "Transparency",
        excellence: "Excellence",
        sustainabilityDesc: "Ecological responsibility in every design decision.",
        innovationDesc: "Pioneers in combining nanotechnology and blockchain telemetry.",
        transparencyDesc: "Immutable data for our clients' peace of mind.",
        excellenceDesc: "We commit to the highest ISO standards.",
        noProfiles: "No team profiles have been registered yet.",
        defaultMember: "Team member",
        defaultUser: "User",
        admin: "Administrator",
        employee: "Employee",
        defaultDescription: "An essential part of our team at Aphellium.",
        liveTag: "Live updates",
      }
    : {
        title: "Quiénes Somos",
        subtitle: "Innovando en la cadena global de frío para proteger nuestro planeta y potenciar las exportaciones.",
        story: "Nuestra Historia",
        storyP1: "Aphellium nació de la necesidad de resolver uno de los mayores problemas del comercio internacional: la pérdida de valor y el enorme costo ambiental de la cadena de frío tradicional. Observando a los agroexportadores en Ecuador (especialmente en floricultura), identificamos que la refrigeración actual era insostenible y costosa.",
        storyP2: "Reuniendo a expertos en nanotecnología y logística, desarrollamos el modelo APHE (Advanced Passive Hybrid Eco-cooler). Hoy, Aphellium no es solo tecnología de enfriamiento, es el estándar de un comercio global responsable, ético y trazable.",
        mission: "Nuestra Misión",
        missionText: "Proporcionar tecnologías de enfriamiento pasivo altamente eficientes y sostenibles, garantizando la integridad de los productos perecederos mientras reducimos drásticamente la huella de carbono del comercio logístico internacional.",
        vision: "Nuestra Visión",
        visionText: "Posicionarnos como el principal aliado tecnológico en América Latina y a nivel global para la exportación carbono-neutral, erradicando la dependencia de la red eléctrica convencional en las rutas de frío severas.",
        values: "Nuestros Valores",
        team: "Nuestro Equipo",
        teamSubtitle: "Conoce a los expertos en refrigeración, inteligencia artificial comercialización detrás de la red de frío de Aphellium.",
        sustainability: "Sostenibilidad",
        innovation: "Innovación",
        transparency: "Transparencia",
        excellence: "Excelencia",
        sustainabilityDesc: "Responsabilidad ecológica en cada decisión de diseño.",
        innovationDesc: "Pioneros en unir nanotecnología y telemetría blockchain.",
        transparencyDesc: "Datos inmutables para la tranquilidad de nuestros clientes.",
        excellenceDesc: "Nos exigimos cumplir los más altos estándares ISO.",
        noProfiles: "Aún no hay perfiles de equipo registrados.",
        defaultMember: "Miembro del equipo",
        defaultUser: "Usuario",
        admin: "Administrador",
        employee: "Empleado",
        defaultDescription: "Parte esencial de nuestro equipo en Aphellium.",
        liveTag: "Actualización en vivo",
      };

  return (
    <main className="flex min-h-screen flex-col items-center">
      {/* Header / Hero Nosotros */}
      <section className="relative w-full pt-24 md:pt-32 pb-12 md:pb-20 overflow-hidden bg-[var(--bg-darker)] border-b border-white/5">
        <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-[var(--accent-green)]/5 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
        <div className="container mx-auto px-4 text-center z-10">
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold mb-4 tracking-tight">
            {t.title.split(" ")[0]} <span className="text-gradient">{t.title.split(" ").slice(1).join(" ")}</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
            {t.subtitle}
          </p>
        </div>
      </section>

      {/* Historia, Misión y Visión */}
      <section className="w-full py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">{t.story}</h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                {t.storyP1}
              </p>
              <p className="text-gray-300 leading-relaxed">
                {t.storyP2}
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-glass p-5 sm:p-8 rounded-2xl border border-white/10 hover:border-[var(--accent-cyan)]/50 transition-colors">
                <h3 className="text-lg sm:text-xl font-bold text-[var(--accent-cyan)] mb-3">{t.mission}</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {t.missionText}
                </p>
              </div>
              
              <div className="bg-glass p-5 sm:p-8 rounded-2xl border border-white/10 hover:border-[var(--accent-green)]/50 transition-colors">
                <h3 className="text-lg sm:text-xl font-bold text-[var(--accent-green)] mb-3">{t.vision}</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {t.visionText}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Valores */}
      <section className="w-full py-12 md:py-20 bg-black/40 border-y border-white/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-8 md:mb-12">{t.values}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            <div className="p-6">
              <div className="w-16 h-16 rounded-full bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] flex items-center justify-center mx-auto mb-4 text-2xl border border-[var(--accent-cyan)]/30">🌱</div>
              <h4 className="font-bold mb-2">{t.sustainability}</h4>
              <p className="text-sm text-gray-400">{t.sustainabilityDesc}</p>
            </div>
            <div className="p-6">
              <div className="w-16 h-16 rounded-full bg-[var(--accent-green)]/10 text-[var(--accent-green)] flex items-center justify-center mx-auto mb-4 text-2xl border border-[var(--accent-green)]/30">⚙️</div>
              <h4 className="font-bold mb-2">{t.innovation}</h4>
              <p className="text-sm text-gray-400">{t.innovationDesc}</p>
            </div>
            <div className="p-6">
              <div className="w-16 h-16 rounded-full bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] flex items-center justify-center mx-auto mb-4 text-2xl border border-[var(--accent-cyan)]/30">🤝</div>
              <h4 className="font-bold mb-2">{t.transparency}</h4>
              <p className="text-sm text-gray-400">{t.transparencyDesc}</p>
            </div>
            <div className="p-6">
              <div className="w-16 h-16 rounded-full bg-[var(--accent-green)]/10 text-[var(--accent-green)] flex items-center justify-center mx-auto mb-4 text-2xl border border-[var(--accent-green)]/30">⭐</div>
              <h4 className="font-bold mb-2">{t.excellence}</h4>
              <p className="text-sm text-gray-400">{t.excellenceDesc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* El Equipo */}
      <section className="w-full py-12 md:py-20 pb-20 md:pb-32">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">{t.team}</h2>
          <p className="text-gray-400 mb-8 md:mb-12 max-w-2xl mx-auto text-sm sm:text-base">
            {t.teamSubtitle}
          </p>
          
          <TeamMembersRealtime
            initialTeamMembers={teamMembers}
            labels={{
              noProfiles: t.noProfiles,
              defaultMember: t.defaultMember,
              defaultUser: t.defaultUser,
              admin: t.admin,
              employee: t.employee,
              defaultDescription: t.defaultDescription,
              liveTag: t.liveTag,
            }}
          />
        </div>
      </section>
    </main>
  );
}
