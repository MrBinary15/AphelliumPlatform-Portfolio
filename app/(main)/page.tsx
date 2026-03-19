import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calendar, MapPin, Star, Zap, Thermometer, Leaf, ShieldCheck, BarChart3, Play } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getServerLanguage } from "@/utils/i18n";
import { pickLocalizedField } from "@/utils/i18n";
import { translateText } from "@/utils/autoTranslate";
import NoticiaImage from "@/components/NoticiaImage";
import HeroVideoBackground from "@/components/HeroVideoBackground";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aphellium | Refrigeración Sostenible",
  description: "Refrigeración sostenible para la floricultura del Ecuador. Tecnología APHE con nanotecnología, IA y blockchain. Reducción de costos energéticos 30%.",
  openGraph: {
    title: "Aphellium | Sustainable Cooling Technology",
    description: "Advanced Passive Hybrid Eco-cooler (APHE) integrating nanotechnology, AI and blockchain for floriculture logistics.",
  },
};

interface NoticiaPreview {
  id: string;
  title: string;
  title_es?: string;
  title_en?: string;
  excerpt: string;
  excerpt_es?: string;
  excerpt_en?: string;
  category: string;
  category_es?: string;
  category_en?: string;
  img_url: string;
  created_at: string;
}

interface ProyectoPreview {
  id: string;
  title: string;
  title_es?: string;
  title_en?: string;
  excerpt: string | null;
  excerpt_es?: string | null;
  excerpt_en?: string | null;
  category: string | null;
  category_es?: string | null;
  category_en?: string | null;
  img_url: string | null;
  location: string | null;
  status: string;
  featured: boolean;
  created_at: string;
}

interface TeamPreview {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  description: string | null;
  role: string | null;
  team_order?: number | null;
  team_section?: string | null;
}

function isFounderPreviewMember(member: TeamPreview): boolean {
  if ((member.team_section || "").toLowerCase() === "founders") return true;

  const text = `${member.job_title || ""} ${member.description || ""}`.toLowerCase();
  return (
    text.includes("fundador") ||
    text.includes("cofundador") ||
    text.includes("founder") ||
    text.includes("co-founder") ||
    text.includes("ceo")
  );
}

function isPreferredHomeLeader(member: TeamPreview): boolean {
  const name = (member.full_name || "").toLowerCase();
  return name.includes("marcos") || name.includes("ruth");
}

export default async function Home() {
  const lang = await getServerLanguage();
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: settings } = await supabase.from('site_settings').select('*');
  const { data: latestArticlesRaw } = await supabase
    .from("noticias")
    .select("id,title,excerpt,category,img_url,created_at")
    .order("created_at", { ascending: false })
    .limit(2)
    .returns<NoticiaPreview[]>();

  const { data: latestProjectsRaw } = await supabase
    .from("proyectos")
    .select("id,title,excerpt,category,img_url,location,status,featured,created_at")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(2)
    .returns<ProyectoPreview[]>();

  const { data: teamWithOrder, error: teamWithOrderError } = await admin
    .from("profiles")
    .select("id, full_name, avatar_url, job_title, description, role, team_order, team_section")
    .not("role", "eq", "visitante")
    .order("team_section", { ascending: true, nullsFirst: false })
    .order("team_order", { ascending: true, nullsFirst: false })
    .order("full_name", { ascending: true })
    .limit(20)
    .returns<TeamPreview[]>();

  let teamPreviewRaw: TeamPreview[] | null = teamWithOrder;
  if (teamWithOrderError) {
    const { data: teamFallback } = await admin
      .from("profiles")
      .select("id, full_name, avatar_url, job_title, description, role")
      .not("role", "eq", "visitante")
      .order("full_name", { ascending: true })
      .limit(20)
      .returns<Omit<TeamPreview, "team_order">[]>();
    teamPreviewRaw = (teamFallback || []).map((row) => ({ ...row, team_order: null }));
  }

  const validTeamPreview = (teamPreviewRaw || []).filter((member) => {
    const hasName = !!member.full_name?.trim();
    const hasRole = !!member.job_title?.trim();
    const hasDescription = !!member.description?.trim();
    return hasName || hasRole || hasDescription;
  });

  const preferredHomeLeaders = validTeamPreview.filter(isPreferredHomeLeader);
  const fallbackFounders = validTeamPreview.filter(isFounderPreviewMember);
  const teamPreview = (preferredHomeLeaders.length > 0 ? preferredHomeLeaders : fallbackFounders).slice(0, 2);

  const settingsMap = settings?.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {} as Record<string, string>) || {};

  const defaultHeroTitle = lang === "en"
    ? "Sustainable Cooling for Ecuador's Floriculture"
    : "Refrigeración Sostenible para la Floricultura del Ecuador";

  const defaultHeroDescription = lang === "en"
    ? "An Advanced Passive Hybrid Eco-cooler (APHE) integrating nanotechnology, AI, and blockchain to reduce energy costs by 30%, eliminate cool breaks, and guarantee ISO 14064 & 14067 compliance."
    : "Un eco-enfriador híbrido pasivo avanzado (APHE) que integra nanotecnología, IA y blockchain para reducir costos de energía en 30%, eliminar quiebres de frío y garantizar cumplimiento ISO 14064 e ISO 14067.";

  const heroTitle =
    (lang === "en" ? settingsMap["hero_title_en"] : settingsMap["hero_title_es"]) ||
    (lang === "en" ? settingsMap["hero_title"] : undefined) ||
    defaultHeroTitle;

  const heroDescription =
    (lang === "en" ? settingsMap["hero_description_en"] : settingsMap["hero_description_es"]) ||
    (lang === "en" ? settingsMap["hero_description"] : undefined) ||
    defaultHeroDescription;
  const t = lang === "en"
    ? {
        badge: "Sustainable Cooling Technology",
        viewCatalog: "Explore Our Technology",
        contactUs: "Contact Us",
        heroChipA: "Nanotechnology",
        heroChipB: "Passive Cooling",
        heroChipC: "AI & Blockchain",
        heroPanelTitle: "Operational Snapshot",
        heroPanelSubtitle: "Real-time signals for export consistency",
        heroPanelTemp: "Cold Core Temperature",
        heroPanelIntegrity: "Chain Integrity",
        heroPanelFleet: "Connected Fleet",
        heroPanelStatus: "All systems stable",
        // Impact stats
        stat1Value: "30%",
        stat1Label: "Energy Cost Reduction",
        stat2Value: "20%",
        stat2Label: "Export Capacity Increase",
        stat3Value: "100%",
        stat3Label: "ISO 14064 & 14067 Compliance",
        stat4Value: "0",
        stat4Label: "Fossil Fuels Required",
        // About section
        aboutBadge: "What is Aphellium?",
        aboutTitle: "The Future of Sustainable Cooling",
        aboutDescription: "Aphellium develops APHE (Advanced Passive Hybrid Eco-cooler), a modular cool room system that combines nanotechnology, chemistry, and physics to provide refrigeration without relying on the electricity grid.",
        aboutDescription2: "Our devices work using passive cooling technologies and solar energy, creating passive ventilation systems that are easily integrated at the end of logistics and production chains in floriculture companies.",
        aboutFeature1Title: "Radiative Cooling",
        aboutFeature1Desc: "Innovative nanomaterial that reflects sunlight and releases thermal radiation naturally.",
        aboutFeature2Title: "Zero Grid Dependency",
        aboutFeature2Desc: "Operates on solar energy and passive thermodynamics — no fossil fuels or refrigerants.",
        aboutFeature3Title: "Blockchain Traceability",
        aboutFeature3Desc: "Transparent monitoring of carbon and water footprint through verified blockchain systems.",
        aboutFeature4Title: "AI Monitoring",
        aboutFeature4Desc: "Real-time environmental monitoring with artificial intelligence for optimal cold chain control.",
        // Problem section
        problemBadge: "The Challenge",
        problemTitle: "Why This Matters",
        problemStat1: "$1B+",
        problemStat1Label: "annual flower exports from Ecuador",
        problemStat2: "15%",
        problemStat2Label: "of production lost to inefficient cooling",
        problemStat3: "$140K+",
        problemStat3Label: "annual energy expenses per large farm",
        problemDescription: "Ecuador's floriculture sector faces critical challenges: inefficient energy infrastructure causes 15% production losses, high cooling costs consume up to 30% of energy budgets, and cool breaks in transportation prevent reaching premium markets like Japan and Europe.",
        // Video section
        videoBadge: "See It in Action",
        videoTitle: "APHE Technology Demo",
        videoSubtitle: "Watch how our passive cooling modules transform floriculture logistics.",
        // Projects
        projectsBadge: "Innovation",
        projectsTitle: "Featured Projects",
        projectsSubtitle: "Real-world applications of our sustainable cooling technology.",
        viewAllProjects: "View all projects",
        viewProject: "View project",
        projectsEmpty: "No projects available yet.",
        // Team
        teamPreviewBadge: "Our People",
        teamPreviewTitle: "Meet the Team",
        teamPreviewSubtitle: "The people building the future of sustainable cooling.",
        viewFullTeam: "See full team",
        teamPreviewEmpty: "Team profiles will appear here soon.",
        foundersPreviewTitle: "Founding Leaders",
        // News
        latestNewsBadge: "Latest",
        latestNewsTitle: "Latest News",
        latestNewsSubtitle: "Updates and insights from the world of sustainable cooling.",
        viewAllNews: "View all news",
        readArticle: "Read article",
        general: "General",
        latestNewsEmpty: "No news available yet.",
        comingSoon: "Coming soon",
        placeholderTitleA: "Cold Chain Innovation: What Comes Next",
        placeholderExcerptA: "We are preparing a technical brief on new passive cooling strategies for floral exports.",
        placeholderTitleB: "AI Monitoring in Logistics",
        placeholderExcerptB: "A practical update on real-time monitoring models for temperature-sensitive cargo.",
        // CTA
        ctaTitle: "Ready to Transform Your Cold Chain?",
        ctaSubtitle: "Join the sustainable cooling revolution. Reduce costs, increase exports, and achieve carbon compliance.",
        ctaButton: "Get in Touch",
        ctaSecondary: "Learn More",
      }
    : {
        badge: "Tecnología de Enfriamiento Sostenible",
        viewCatalog: "Conoce Nuestra Tecnología",
        contactUs: "Contáctanos",
        heroChipA: "Nanotecnología",
        heroChipB: "Enfriamiento Pasivo",
        heroChipC: "IA & Blockchain",
        heroPanelTitle: "Estado Operativo",
        heroPanelSubtitle: "Señales en tiempo real para exportación estable",
        heroPanelTemp: "Temperatura núcleo frío",
        heroPanelIntegrity: "Integridad de cadena",
        heroPanelFleet: "Flota conectada",
        heroPanelStatus: "Sistemas estables",
        // Impact stats
        stat1Value: "30%",
        stat1Label: "Reducción de Costos Energéticos",
        stat2Value: "20%",
        stat2Label: "Aumento de Capacidad Exportadora",
        stat3Value: "100%",
        stat3Label: "Cumplimiento ISO 14064 & 14067",
        stat4Value: "0",
        stat4Label: "Combustibles Fósiles Requeridos",
        // About section
        aboutBadge: "¿Qué es Aphellium?",
        aboutTitle: "El Futuro del Enfriamiento Sostenible",
        aboutDescription: "Aphellium desarrolla APHE (Eco-enfriador Híbrido Pasivo Avanzado), un sistema modular de cuartos fríos que combina nanotecnología, química y física para proveer refrigeración sin depender de la red eléctrica.",
        aboutDescription2: "Nuestros dispositivos funcionan con tecnologías de enfriamiento pasivo y energía solar, creando sistemas de ventilación pasiva que se integran fácilmente en las cadenas logísticas y de producción de las florícolas.",
        aboutFeature1Title: "Enfriamiento Radiativo",
        aboutFeature1Desc: "Nanomaterial innovador que refleja la luz solar y libera radiación térmica de forma natural.",
        aboutFeature2Title: "Cero Dependencia Eléctrica",
        aboutFeature2Desc: "Opera con energía solar y termodinámica pasiva — sin combustibles fósiles ni refrigerantes.",
        aboutFeature3Title: "Trazabilidad Blockchain",
        aboutFeature3Desc: "Monitoreo transparente de la huella de carbono e hídrica mediante sistemas verificados en blockchain.",
        aboutFeature4Title: "Monitoreo con IA",
        aboutFeature4Desc: "Monitoreo ambiental en tiempo real con inteligencia artificial para control óptimo de la cadena de frío.",
        // Problem section
        problemBadge: "El Desafío",
        problemTitle: "¿Por Qué Importa?",
        problemStat1: "$1B+",
        problemStat1Label: "en exportaciones anuales de flores del Ecuador",
        problemStat2: "15%",
        problemStat2Label: "de producción perdida por enfriamiento ineficiente",
        problemStat3: "$140K+",
        problemStat3Label: "gastos anuales de energía por finca grande",
        problemDescription: "El sector florícola del Ecuador enfrenta desafíos críticos: la infraestructura energética ineficiente causa 15% de pérdidas en producción, los altos costos de refrigeración consumen hasta el 30% del presupuesto energético, y los quiebres de frío en el transporte impiden alcanzar mercados premium como Japón y Europa.",
        // Video section
        videoBadge: "Míralo en Acción",
        videoTitle: "Demo Tecnología APHE",
        videoSubtitle: "Descubre cómo nuestros módulos de enfriamiento pasivo transforman la logística florícola.",
        // Projects
        projectsBadge: "Innovación",
        projectsTitle: "Proyectos Destacados",
        projectsSubtitle: "Aplicaciones reales de nuestra tecnología de enfriamiento sostenible.",
        viewAllProjects: "Ver todos los proyectos",
        viewProject: "Ver proyecto",
        projectsEmpty: "Aún no hay proyectos disponibles.",
        // Team
        teamPreviewBadge: "Nuestro Equipo",
        teamPreviewTitle: "Conoce al Equipo",
        teamPreviewSubtitle: "Las personas que construyen el futuro del enfriamiento sostenible.",
        viewFullTeam: "Ver equipo completo",
        teamPreviewEmpty: "Los perfiles del equipo aparecerán aquí pronto.",
        foundersPreviewTitle: "Líderes Fundadores",
        // News
        latestNewsBadge: "Actualidad",
        latestNewsTitle: "Últimas Noticias",
        latestNewsSubtitle: "Novedades y análisis del mundo del enfriamiento sostenible.",
        viewAllNews: "Ver todas las noticias",
        readArticle: "Leer artículo",
        general: "General",
        latestNewsEmpty: "Aún no hay noticias publicadas.",
        comingSoon: "Próximamente",
        placeholderTitleA: "Innovación en cadena de frío: lo que viene",
        placeholderExcerptA: "Estamos preparando un informe técnico sobre nuevas estrategias de enfriamiento pasivo para exportación floral.",
        placeholderTitleB: "Monitoreo con IA en logística",
        placeholderExcerptB: "Una actualización práctica sobre modelos de monitoreo en tiempo real para carga sensible a temperatura.",
        // CTA
        ctaTitle: "¿Listo para Transformar tu Cadena de Frío?",
        ctaSubtitle: "Únete a la revolución del enfriamiento sostenible. Reduce costos, aumenta exportaciones y cumple con las regulaciones de carbono.",
        ctaButton: "Contáctanos",
        ctaSecondary: "Saber Más",
      };

        const founderPreview = teamPreview.slice(0, 2);
        const otherTeamPreview: TeamPreview[] = [];

  const latestArticles = latestArticlesRaw
    ? await Promise.all(
        latestArticlesRaw.map(async (article) => {
          const record = article as unknown as Record<string, unknown>;
          const storedTitle = pickLocalizedField(record, "title", lang, { fallbackToBase: false });
          const storedExcerpt = pickLocalizedField(record, "excerpt", lang, { fallbackToBase: false });
          const storedCategory = pickLocalizedField(record, "category", lang, { fallbackToBase: false });

          const title = storedTitle || (await translateText(article.title || "", lang));
          const excerpt = storedExcerpt || (await translateText(article.excerpt || "", lang));
          const category = storedCategory || (await translateText(article.category || "", lang));

          return { ...article, title, excerpt, category };
        }),
      )
    : [];

  const placeholderArticles = [
    {
      id: "placeholder-a",
      title: t.placeholderTitleA,
      excerpt: t.placeholderExcerptA,
      category: t.comingSoon,
      img_url: "",
      created_at: new Date().toISOString(),
      isPlaceholder: true,
    },
    {
      id: "placeholder-b",
      title: t.placeholderTitleB,
      excerpt: t.placeholderExcerptB,
      category: t.comingSoon,
      img_url: "",
      created_at: new Date().toISOString(),
      isPlaceholder: true,
    },
  ];

  const displayArticles = latestArticles.length > 0 ? latestArticles : placeholderArticles;

  const STATUS_MAP: Record<string, { es: string; en: string }> = {
    planning: { es: "En Planificación", en: "Planning" },
    active: { es: "En Curso", en: "Active" },
    completed: { es: "Completado", en: "Completed" },
    paused: { es: "Pausado", en: "Paused" },
  };

  const latestProjects = latestProjectsRaw
    ? await Promise.all(
        latestProjectsRaw.map(async (project) => {
          const record = project as unknown as Record<string, unknown>;
          const title = pickLocalizedField(record, "title", lang, { fallbackToBase: false }) || (await translateText(project.title || "", lang));
          const excerpt = pickLocalizedField(record, "excerpt", lang, { fallbackToBase: false }) || (await translateText(project.excerpt || "", lang));
          const category = pickLocalizedField(record, "category", lang, { fallbackToBase: false }) || (await translateText(project.category || "", lang));
          const statusLabel = STATUS_MAP[project.status]?.[lang] || project.status;
          return { ...project, title, excerpt, category, statusLabel };
        }),
      )
    : [];

  // Fancy rendering for the title (make the last two words gradient if possible)
  const titleWords = heroTitle.split(' ');
  const lastWords = titleWords.length > 2 ? titleWords.splice(-2).join(' ') : '';
  const firstPart = titleWords.join(' ');

  return (
    <main className="flex min-h-screen flex-col">
      {/* ═══════════════════════════════════════════
          1. HERO — Full-viewport immersive intro
      ═══════════════════════════════════════════ */}
      <section className="relative w-full min-h-[100vh] flex items-center pt-20 md:pt-0 overflow-hidden">
        <HeroVideoBackground />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(2,6,16,0.55)_0%,rgba(2,6,16,0.30)_40%,rgba(2,6,16,0.80)_100%)] z-[1]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(6,182,212,0.15),transparent_50%),radial-gradient(ellipse_at_80%_80%,rgba(16,185,129,0.12),transparent_50%)] z-[1]" />

        <div className="container mx-auto px-5 sm:px-6 z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center py-16 md:py-24">
          {/* Left: Text */}
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[var(--accent-cyan)]/40 bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] font-semibold text-[11px] sm:text-xs mb-6 uppercase tracking-[0.15em]">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-cyan)] animate-pulse" />
              {t.badge}
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] xl:text-6xl font-extrabold mb-6 leading-[1.08] tracking-tight text-white">
              {firstPart}{" "}
              {lastWords && <><br className="hidden sm:block" /><span className="text-gradient">{lastWords}</span></>}
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-gray-200/90 mb-8 max-w-xl leading-relaxed">
              {heroDescription}
            </p>

            <div className="flex flex-wrap gap-2.5 mb-8">
              {[t.heroChipA, t.heroChipB, t.heroChipC].map((chip) => (
                <span key={chip} className="px-3 py-1.5 rounded-full bg-white/8 border border-white/12 text-xs font-semibold text-gray-200 backdrop-blur-sm">{chip}</span>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link href="/proyectos" className="bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/85 text-white font-bold px-7 py-3.5 sm:px-9 sm:py-4 rounded-xl transition-all hover:-translate-y-0.5 shadow-[0_8px_32px_var(--accent-cyan-glow)] text-center text-sm sm:text-base">
                {t.viewCatalog}
              </Link>
              <Link href="/contacto" className="bg-white/5 border border-white/20 hover:border-white/40 hover:bg-white/10 text-white font-bold px-7 py-3.5 sm:px-9 sm:py-4 rounded-xl transition-all hover:-translate-y-0.5 text-center backdrop-blur-md text-sm sm:text-base">
                {t.contactUs}
              </Link>
            </div>
          </div>

          {/* Right: Operational Panel (desktop) */}
          <div className="relative hidden lg:block">
            <div className="absolute -inset-6 rounded-3xl bg-[radial-gradient(circle,rgba(6,182,212,0.18),transparent_65%)] blur-2xl animate-pulse" />
            <div className="relative bg-black/40 border border-white/12 backdrop-blur-2xl rounded-3xl p-7 shadow-2xl overflow-hidden">
              <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-[var(--accent-cyan)] via-[#2dd4bf] to-[var(--accent-green)]" />

              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-[var(--accent-cyan)] font-semibold">{t.heroPanelTitle}</p>
                  <p className="text-sm text-gray-400 mt-1">{t.heroPanelSubtitle}</p>
                </div>
                <div className="text-[11px] px-3 py-1 rounded-full bg-[var(--accent-green)]/15 border border-[var(--accent-green)]/40 text-[var(--accent-green)] font-semibold">
                  {t.heroPanelStatus}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between text-xs text-gray-400 uppercase tracking-wider mb-2.5">
                    <span>{t.heroPanelTemp}</span>
                    <span className="text-[var(--accent-cyan)] font-semibold">2.4°C</span>
                  </div>
                  <div className="h-2 rounded-full bg-black/40 overflow-hidden">
                    <div className="h-full w-[84%] bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-green)] animate-[pulse_2.8s_ease-in-out_infinite]" />
                  </div>
                </div>
                <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between text-xs text-gray-400 uppercase tracking-wider mb-2.5">
                    <span>{t.heroPanelIntegrity}</span>
                    <span className="text-[var(--accent-green)] font-semibold">100%</span>
                  </div>
                  <div className="h-2 rounded-full bg-black/40 overflow-hidden">
                    <div className="h-full w-full bg-gradient-to-r from-[var(--accent-green)] to-[#34d399]" />
                  </div>
                </div>
                <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between text-xs text-gray-400 uppercase tracking-wider mb-3">
                    <span>{t.heroPanelFleet}</span>
                    <span className="text-white font-semibold">89</span>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <span key={`fleet-${i}`} className="h-2.5 rounded-full bg-[var(--accent-cyan)]/60 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 hidden md:flex flex-col items-center gap-2 animate-bounce">
          <div className="w-5 h-8 rounded-full border-2 border-white/25 flex items-start justify-center p-1">
            <div className="w-1 h-2 rounded-full bg-white/60" />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          2. IMPACT STATS — Key numbers strip
      ═══════════════════════════════════════════ */}
      <section className="w-full relative z-10 -mt-1">
        <div className="bg-gradient-to-r from-[var(--accent-cyan)]/10 via-[var(--accent-green)]/8 to-[var(--accent-cyan)]/10 border-y border-white/8 backdrop-blur-xl">
          <div className="container mx-auto px-5 sm:px-6 py-8 md:py-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {[
                { value: t.stat1Value, label: t.stat1Label, icon: Zap },
                { value: t.stat2Value, label: t.stat2Label, icon: BarChart3 },
                { value: t.stat3Value, label: t.stat3Label, icon: ShieldCheck },
                { value: t.stat4Value, label: t.stat4Label, icon: Leaf },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col items-center text-center gap-2">
                  <stat.icon size={20} className="text-[var(--accent-cyan)] mb-1" />
                  <span className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">{stat.value}</span>
                  <span className="text-[11px] sm:text-xs text-gray-400 font-medium leading-snug max-w-[140px]">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          3. ABOUT APHELLIUM — Story + Features
      ═══════════════════════════════════════════ */}
      <section className="w-full py-20 md:py-28 lg:py-32">
        <div className="container mx-auto px-5 sm:px-6 max-w-7xl">
          {/* Section header */}
          <div className="text-center mb-14 md:mb-20">
            <span className="inline-flex px-4 py-1.5 rounded-full border border-[var(--accent-cyan)]/25 bg-[var(--accent-cyan)]/8 text-[var(--accent-cyan)] text-xs font-semibold uppercase tracking-wider mb-4">
              {t.aboutBadge}
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-6">
              {t.aboutTitle}
            </h2>
          </div>

          {/* Content: Image + Text */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center mb-16 md:mb-24">
            {/* Product Image */}
            <div className="relative group">
              <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-[var(--accent-cyan)]/20 to-[var(--accent-green)]/20 blur-2xl opacity-50 group-hover:opacity-70 transition-opacity" />
              <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-white flex items-center justify-center p-8 sm:p-12 md:p-16">
                <Image
                  src="/assets/aphellium-logo-5.jpg"
                  alt="Aphellium — Passive Cooling"
                  width={700}
                  height={412}
                  className="w-full h-auto object-contain"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-6">
              <p className="text-base sm:text-lg text-gray-300 leading-relaxed">
                {t.aboutDescription}
              </p>
              <p className="text-base sm:text-lg text-gray-400 leading-relaxed">
                {t.aboutDescription2}
              </p>
              <div className="pt-2">
                <Link href="/nosotros" className="inline-flex items-center gap-2.5 text-[var(--accent-cyan)] font-semibold text-sm hover:gap-3.5 transition-all">
                  {t.ctaSecondary}
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>

          {/* Feature Cards — 4-column grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
            {[
              { icon: Thermometer, title: t.aboutFeature1Title, desc: t.aboutFeature1Desc, color: "cyan" },
              { icon: Zap, title: t.aboutFeature2Title, desc: t.aboutFeature2Desc, color: "green" },
              { icon: ShieldCheck, title: t.aboutFeature3Title, desc: t.aboutFeature3Desc, color: "cyan" },
              { icon: BarChart3, title: t.aboutFeature4Title, desc: t.aboutFeature4Desc, color: "green" },
            ].map((f) => (
              <div key={f.title} className="group bg-white/[0.03] border border-white/8 rounded-2xl p-6 hover:border-[var(--accent-cyan)]/30 hover:bg-white/[0.05] transition-all">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${f.color === "cyan" ? "bg-[var(--accent-cyan)]/15 text-[var(--accent-cyan)]" : "bg-[var(--accent-green)]/15 text-[var(--accent-green)]"}`}>
                  <f.icon size={22} />
                </div>
                <h3 className="text-white font-bold text-base mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          4. THE PROBLEM — Why this matters
      ═══════════════════════════════════════════ */}
      <section className="w-full py-20 md:py-28 relative overflow-hidden">
        {/* Subtle background */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--accent-cyan)]/[0.03] to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="container mx-auto px-5 sm:px-6 max-w-6xl relative z-10">
          <div className="text-center mb-12 md:mb-16">
            <span className="inline-flex px-4 py-1.5 rounded-full border border-amber-400/25 bg-amber-400/8 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-4">
              {t.problemBadge}
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-6">
              {t.problemTitle}
            </h2>
            <p className="text-gray-400 text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">
              {t.problemDescription}
            </p>
          </div>

          {/* Problem Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 md:gap-6">
            {[
              { value: t.problemStat1, label: t.problemStat1Label },
              { value: t.problemStat2, label: t.problemStat2Label },
              { value: t.problemStat3, label: t.problemStat3Label },
            ].map((s) => (
              <div key={s.value} className="relative bg-white/[0.03] border border-white/8 rounded-2xl p-8 text-center overflow-hidden group hover:border-amber-400/20 transition-all">
                <div className="absolute inset-0 bg-gradient-to-b from-amber-400/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative text-3xl sm:text-4xl md:text-5xl font-black text-gradient mb-3 block">{s.value}</span>
                <span className="relative text-gray-400 text-sm leading-snug">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          5. CORE TECHNOLOGY — Visual showcase
      ═══════════════════════════════════════════ */}
      <section className="w-full py-20 md:py-28 relative overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/assets/aphellium-bg-tech.png"
            alt=""
            fill
            className="object-cover opacity-15"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-[var(--bg-dark)]/85" />
        </div>

        <div className="container mx-auto px-5 sm:px-6 max-w-6xl relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <span className="inline-flex px-4 py-1.5 rounded-full border border-[var(--accent-green)]/25 bg-[var(--accent-green)]/8 text-[var(--accent-green)] text-xs font-semibold uppercase tracking-wider mb-5">
                {lang === "en" ? "Core Technology" : "Tecnología Central"}
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-6 leading-[1.1]">
                {lang === "en"
                  ? <>Radiative Cooling <span className="text-gradient">Reinvented</span></>
                  : <>Enfriamiento Radiativo <span className="text-gradient">Reinventado</span></>
                }
              </h2>
              <div className="space-y-4 text-gray-300 text-base sm:text-lg leading-relaxed">
                <p>
                  {lang === "en"
                    ? "Our core technology harnesses radiative cooling — a natural process used by animals like camels and Saharan ants — enhanced with advanced nanomaterials."
                    : "Nuestra tecnología central aprovecha el enfriamiento radiativo — un proceso natural usado por animales como camellos y hormigas del Sáhara — potenciado con nanomateriales avanzados."
                  }
                </p>
                <p>
                  {lang === "en"
                    ? "The aerogel structure traps air for insulation, while the surface chemistry reflects sunlight and releases thermal radiation. Combined with evaporative heat loss and a solar-powered passive ventilation system."
                    : "La estructura de aerogel atrapa aire para aislamiento, mientras la química superficial refleja la luz solar y libera radiación térmica. Combinado con pérdida de calor evaporativa y un sistema de ventilación pasiva impulsado por energía solar."
                  }
                </p>
              </div>

              {/* Tech highlights */}
              <div className="grid grid-cols-2 gap-3 mt-8">
                {(lang === "en"
                  ? ["Nanoparticles", "Aerogel Insulation", "Solar Ventilation", "Green H₂ Recycling"]
                  : ["Nanopartículas", "Aislamiento Aerogel", "Ventilación Solar", "Reciclaje H₂ Verde"]
                ).map((item) => (
                  <div key={item} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/8">
                    <div className="w-2 h-2 rounded-full bg-[var(--accent-green)]" />
                    <span className="text-sm text-gray-300 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tech visual */}
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[var(--accent-green)]/15 to-[var(--accent-cyan)]/15 blur-3xl" />
              <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                <Image
                  src="/assets/aphellium-bg-hero.png"
                  alt="Aphellium Technology"
                  width={700}
                  height={500}
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          6. VIDEO SHOWCASE — YouTube embed
      ═══════════════════════════════════════════ */}
      <section className="w-full py-20 md:py-28">
        <div className="container mx-auto px-5 sm:px-6 max-w-5xl">
          <div className="text-center mb-10 md:mb-14">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--accent-cyan)]/25 bg-[var(--accent-cyan)]/8 text-[var(--accent-cyan)] text-xs font-semibold uppercase tracking-wider mb-4">
              <Play size={13} />
              {t.videoBadge}
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
              {t.videoTitle}
            </h2>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
              {t.videoSubtitle}
            </p>
          </div>

          {/* Video embed */}
          <div className="relative group">
            <div className="absolute -inset-3 rounded-3xl bg-gradient-to-r from-[var(--accent-cyan)]/20 via-[var(--accent-green)]/15 to-[var(--accent-cyan)]/20 blur-2xl opacity-40 group-hover:opacity-60 transition-opacity" />
            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
              <div className="aspect-[9/16] sm:aspect-video max-w-md sm:max-w-none mx-auto">
                <iframe
                  src="https://www.youtube.com/embed/bm1WbVp3sJM"
                  title="Aphellium APHE Technology Demo"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          7. PROJECTS SECTION
      ═══════════════════════════════════════════ */}
      <section className="w-full py-20 md:py-28 relative">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="container mx-auto px-5 sm:px-6 max-w-6xl">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 md:mb-14">
            <div>
              <span className="inline-flex px-4 py-1.5 rounded-full border border-[var(--accent-cyan)]/25 bg-[var(--accent-cyan)]/8 text-[var(--accent-cyan)] text-xs font-semibold uppercase tracking-wider mb-4">
                {t.projectsBadge}
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">{t.projectsTitle}</h2>
              <p className="text-gray-400 mt-3 max-w-2xl text-base sm:text-lg">{t.projectsSubtitle}</p>
            </div>
            <Link href="/proyectos" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]/80 transition-colors shrink-0">
              {t.viewAllProjects}
              <ArrowRight size={16} />
            </Link>
          </div>

          {latestProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {latestProjects.map((project) => (
                <Link key={project.id} href={`/proyectos/${project.id}`} className="group bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden hover:border-[var(--accent-cyan)]/30 transition-all block">
                  <div className="relative h-44 sm:h-52 bg-slate-900 overflow-hidden">
                    {project.img_url ? (
                      <Image src={project.img_url} alt={project.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center text-5xl opacity-10">🏗️</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute left-4 top-4 flex gap-2">
                      {project.category && (
                        <span className="px-3 py-1 rounded-full bg-black/50 border border-white/10 text-[11px] font-bold tracking-wide uppercase text-[var(--accent-green)]">
                          {project.category}
                        </span>
                      )}
                      <span className="px-3 py-1 rounded-full bg-black/50 border border-white/10 text-[11px] font-bold tracking-wide uppercase text-[var(--accent-cyan)]">
                        {project.statusLabel}
                      </span>
                    </div>
                    {project.featured && (
                      <div className="absolute top-4 right-4">
                        <Star size={18} className="text-amber-400 fill-amber-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                      {project.location && (<span className="flex items-center gap-1"><MapPin size={12} />{project.location}</span>)}
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(project.created_at).toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 group-hover:text-[var(--accent-cyan)] transition-colors">{project.title}</h3>
                    {project.excerpt && (<p className="text-sm text-gray-400 leading-relaxed line-clamp-3 mb-5">{project.excerpt}</p>)}
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-white group-hover:text-[var(--accent-cyan)] transition-colors">
                      {t.viewProject}
                      <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-5xl mb-4 opacity-20">🏗️</div>
              <p className="text-gray-500">{t.projectsEmpty}</p>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          8. TEAM PREVIEW SECTION
      ═══════════════════════════════════════════ */}
      <section className="w-full py-20 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--accent-cyan)]/[0.02] to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="container mx-auto px-5 sm:px-6 max-w-6xl relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 md:mb-14">
            <div>
              <span className="inline-flex px-4 py-1.5 rounded-full border border-[var(--accent-cyan)]/25 bg-[var(--accent-cyan)]/8 text-[var(--accent-cyan)] text-xs font-semibold uppercase tracking-wider mb-4">
                {t.teamPreviewBadge}
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">{t.teamPreviewTitle}</h2>
              <p className="text-gray-400 mt-3 max-w-2xl text-base sm:text-lg">{t.teamPreviewSubtitle}</p>
            </div>
            <Link href="/nosotros" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]/80 transition-colors shrink-0">
              {t.viewFullTeam}
              <ArrowRight size={16} />
            </Link>
          </div>

          {teamPreview.length > 0 ? (
            <div className="space-y-8">
              {founderPreview.length > 0 && (
                <div className="space-y-5">
                  <h3 className="text-center text-sm sm:text-base font-bold text-[var(--accent-cyan)]/80 tracking-widest uppercase">{t.foundersPreviewTitle}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-4xl mx-auto">
                    {founderPreview.map((member) => (
                      <Link key={member.id} href="/nosotros" className="group bg-white/[0.03] border border-[var(--accent-cyan)]/20 rounded-2xl overflow-hidden hover:border-[var(--accent-cyan)]/40 transition-all block">
                        <div className="relative h-44 sm:h-52 bg-slate-900 overflow-hidden">
                          {member.avatar_url ? (
                            <Image src={member.avatar_url} alt={member.full_name || "Miembro"} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center text-5xl opacity-10">👤</div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        </div>
                        <div className="p-5">
                          <h3 className="text-lg font-bold text-white mb-1.5 line-clamp-1 group-hover:text-[var(--accent-cyan)] transition-colors" data-inline-edit-key={`profile:${member.id}:full_name`}>
                            {member.full_name || (lang === "en" ? "Team member" : "Miembro del equipo")}
                          </h3>
                          <p className="text-[var(--accent-cyan)] text-[11px] font-semibold uppercase tracking-wide mb-2.5 line-clamp-1" data-inline-edit-key={`profile:${member.id}:job_title`}>
                            {member.job_title || (member.role === "admin" ? (lang === "en" ? "Administrator" : "Administrador") : (lang === "en" ? "Team" : "Equipo"))}
                          </p>
                          <p className="text-sm text-gray-400 leading-relaxed line-clamp-2 mb-4" data-inline-edit-key={`profile:${member.id}:description`}>
                            {member.description || (lang === "en" ? "Part of our multidisciplinary innovation team." : "Parte de nuestro equipo multidisciplinario de innovación.")}
                          </p>
                          <span className="inline-flex items-center gap-2 text-xs font-semibold text-white group-hover:text-[var(--accent-cyan)] transition-colors">
                            {t.viewFullTeam}
                            <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-14">
              <p className="text-gray-500">{t.teamPreviewEmpty}</p>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          9. NEWS SECTION
      ═══════════════════════════════════════════ */}
      <section className="w-full py-20 md:py-28 relative">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="container mx-auto px-5 sm:px-6 max-w-6xl">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 md:mb-14">
            <div>
              <span className="inline-flex px-4 py-1.5 rounded-full border border-[var(--accent-green)]/25 bg-[var(--accent-green)]/8 text-[var(--accent-green)] text-xs font-semibold uppercase tracking-wider mb-4">
                {t.latestNewsBadge}
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">{t.latestNewsTitle}</h2>
              <p className="text-gray-400 mt-3 max-w-2xl text-base sm:text-lg">{t.latestNewsSubtitle}</p>
            </div>
            <Link href="/noticias-principal" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]/80 transition-colors shrink-0">
              {t.viewAllNews}
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayArticles.map((article) => {
              const articleHref = article.id.startsWith("placeholder-") ? "/noticias-principal" : `/noticias-principal/${article.id}`;
              return (
                <Link key={article.id} href={articleHref} className="group bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden hover:border-[var(--accent-cyan)]/30 transition-all block">
                  <div className="relative h-44 sm:h-52 bg-slate-900 overflow-hidden">
                    {article.img_url ? (
                      <NoticiaImage src={article.img_url} alt={article.title} />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <span className="absolute left-4 top-4 px-3 py-1 rounded-full bg-black/50 border border-white/10 text-[11px] font-bold tracking-wide uppercase text-[var(--accent-green)]">
                      {article.category || t.general}
                    </span>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                      <Calendar size={13} />
                      <span>
                        {new Date(article.created_at).toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 group-hover:text-[var(--accent-cyan)] transition-colors">{article.title}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed line-clamp-3 mb-5">{article.excerpt}</p>
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-white group-hover:text-[var(--accent-cyan)] transition-colors">
                      {t.readArticle}
                      <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          10. CTA SECTION — Final call to action
      ═══════════════════════════════════════════ */}
      <section className="w-full py-20 md:py-28 relative overflow-hidden" data-no-inline-edit="true">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-cyan)]/[0.06] via-[var(--accent-green)]/[0.04] to-[var(--accent-cyan)]/[0.06]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-cyan)]/30 to-transparent" />

        <div className="container mx-auto px-5 sm:px-6 max-w-4xl relative z-10 text-center">
          <div className="mb-8">
            <Image src="/assets/aphellium-logo-4.png" alt="Aphellium" width={64} height={64} className="mx-auto mb-6 opacity-80" />
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-5 leading-tight">
            {t.ctaTitle}
          </h2>
          <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            {t.ctaSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contacto" className="bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/85 text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-0.5 shadow-[0_8px_32px_var(--accent-cyan-glow)] text-center text-base">
              {t.ctaButton}
            </Link>
            <Link href="/nosotros" className="bg-white/5 border border-white/20 hover:border-white/40 hover:bg-white/10 text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-0.5 text-center backdrop-blur-md text-base">
              {t.ctaSecondary}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
