import { createAdminClient } from "@/utils/supabase/admin";
import { getServerLanguage } from "@/utils/i18n";
import TeamMembersRealtime from "@/components/TeamMembersRealtime";
import ScrollReveal from "@/components/ScrollReveal";
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
  team_order: number | null;
  team_section?: string | null;
}

export default async function NosotrosPage() {
  const lang = await getServerLanguage();
  const admin = createAdminClient();
  const { data: teamMembersWithOrder, error: withOrderError } = await admin
    .from("profiles")
    .select("id, full_name, avatar_url, job_title, description, role, team_order, team_section")
    .not("role", "eq", "visitante")
    .order("team_section", { ascending: true, nullsFirst: false })
    .order("team_order", { ascending: true, nullsFirst: false })
    .order("full_name", { ascending: true })
    .returns<Profile[]>();

  let teamMembersRaw: Profile[] | null = teamMembersWithOrder;
  if (withOrderError) {
    // Backward compatibility for environments where team_order is not migrated yet.
    const { data: fallbackData } = await admin
      .from("profiles")
      .select("id, full_name, avatar_url, job_title, description, role")
      .not("role", "eq", "visitante")
      .order("full_name", { ascending: true });
    teamMembersRaw = (fallbackData as Profile[] | null) || [];
  }

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
        foundersTitle: "Founding Leaders",
        leadershipTitle: "Coordinator",
        teamTitle: "Technical Team",
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
        foundersTitle: "Lideres Fundadores",
        leadershipTitle: "Coordinador",
        teamTitle: "Equipo Técnico",
      };

  return (
    <main className="flex min-h-screen flex-col items-center">
      {/* Header / Hero Nosotros */}
      <section className="relative w-full pt-28 md:pt-36 pb-16 md:pb-24 overflow-hidden bg-[var(--bg-darker)] section-mesh">
        <div className="glow-orb glow-orb-green w-[600px] h-[600px] -top-40 right-0 opacity-15" />
        <div className="glow-orb glow-orb-cyan w-[400px] h-[400px] bottom-0 left-0 opacity-10" />
        <div className="divider-glow absolute bottom-0 left-0 right-0" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <ScrollReveal>
            <span className="badge-premium-green mb-6 inline-flex">{lang === 'en' ? 'About Us' : 'Sobre Nosotros'}</span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-5 tracking-tight hero-title-line">
              {t.title.split(" ")[0]} <span className="text-gradient-animated">{t.title.split(" ").slice(1).join(" ")}</span>
            </h1>
            <p className="hero-description text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
              {t.subtitle}
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Historia, Misión y Visión */}
      <section className="w-full py-16 md:py-24 relative section-noise">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
            <ScrollReveal direction="left">
              <span className="badge-premium mb-4 inline-flex">{t.story}</span>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">{t.story}</h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                {t.storyP1}
              </p>
              <p className="text-gray-300 leading-relaxed">
                {t.storyP2}
              </p>
            </ScrollReveal>
            
            <div className="grid grid-cols-1 gap-6">
              <ScrollReveal direction="right" delay={1}>
                <div className="card-premium p-5 sm:p-8">
                  <div className="feature-icon feature-icon-cyan mb-4">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-[var(--accent-cyan)] mb-3">{t.mission}</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {t.missionText}
                  </p>
                </div>
              </ScrollReveal>
              
              <ScrollReveal direction="right" delay={2}>
                <div className="card-premium-green p-5 sm:p-8">
                  <div className="feature-icon feature-icon-green mb-4">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-[var(--accent-green)] mb-3">{t.vision}</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {t.visionText}
                  </p>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* Valores */}
      <section className="w-full py-16 md:py-24 relative overflow-hidden section-dots">
        <div className="divider-glow absolute top-0 left-0 right-0" />
        <div className="glow-orb glow-orb-purple w-[400px] h-[400px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <ScrollReveal>
            <span className="badge-premium-amber mb-4 inline-flex">{t.values}</span>
            <h2 className="text-2xl sm:text-3xl font-bold mb-10 md:mb-14">{t.values}</h2>
          </ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            <ScrollReveal delay={1}>
              <div className="card-premium p-6 text-center h-full">
                <div className="feature-icon feature-icon-cyan mx-auto mb-4">
                  <span className="text-lg">🌱</span>
                </div>
                <h4 className="font-bold mb-2">{t.sustainability}</h4>
                <p className="text-sm text-gray-400">{t.sustainabilityDesc}</p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={2}>
              <div className="card-premium-green p-6 text-center h-full">
                <div className="feature-icon feature-icon-green mx-auto mb-4">
                  <span className="text-lg">⚙️</span>
                </div>
                <h4 className="font-bold mb-2">{t.innovation}</h4>
                <p className="text-sm text-gray-400">{t.innovationDesc}</p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={3}>
              <div className="card-premium p-6 text-center h-full">
                <div className="feature-icon feature-icon-cyan mx-auto mb-4">
                  <span className="text-lg">🤝</span>
                </div>
                <h4 className="font-bold mb-2">{t.transparency}</h4>
                <p className="text-sm text-gray-400">{t.transparencyDesc}</p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={4}>
              <div className="card-premium-green p-6 text-center h-full">
                <div className="feature-icon feature-icon-green mx-auto mb-4">
                  <span className="text-lg">⭐</span>
                </div>
                <h4 className="font-bold mb-2">{t.excellence}</h4>
                <p className="text-sm text-gray-400">{t.excellenceDesc}</p>
              </div>
            </ScrollReveal>
          </div>
        </div>
        <div className="divider-gradient absolute bottom-0 left-0 right-0" />
      </section>

      {/* El Equipo */}
      <section className="w-full py-16 md:py-24 pb-20 md:pb-32 relative section-mesh">
        <div className="glow-orb glow-orb-cyan w-[500px] h-[500px] -top-40 -right-40 opacity-10" />
        <div className="glow-orb glow-orb-green w-[400px] h-[400px] bottom-0 -left-40 opacity-10" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <ScrollReveal>
            <span className="badge-premium mb-4 inline-flex">{t.team}</span>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">{t.team}</h2>
            <p className="text-gray-400 mb-10 md:mb-14 max-w-2xl mx-auto text-sm sm:text-base">
              {t.teamSubtitle}
            </p>
          </ScrollReveal>
          
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
              foundersTitle: t.foundersTitle,
              leadershipTitle: t.leadershipTitle,
              teamTitle: t.teamTitle,
            }}
          />
        </div>
      </section>
    </main>
  );
}
