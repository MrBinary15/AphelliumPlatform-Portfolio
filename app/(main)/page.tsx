import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calendar, MapPin, Star } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { getServerLanguage } from "@/utils/i18n";
import { pickLocalizedField } from "@/utils/i18n";
import { translateText } from "@/utils/autoTranslate";
import NoticiaImage from "@/components/NoticiaImage";
import HeroVideoBackground from "@/components/HeroVideoBackground";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inicio",
  description: "Refrigeración sostenible para la floricultura del Ecuador. Tecnología APHE con nanotecnología, IA y blockchain.",
  openGraph: {
    title: "Aphellium | Sustainable Cooling Technology",
    description: "Advanced passive hybrid eco-cooler for floriculture logistics.",
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

export default async function Home() {
  const lang = await getServerLanguage();
  const supabase = await createClient();
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
        badge: "Eco-Friendly Global Trade",
        viewCatalog: "View Catalog (Technology)",
        contactUs: "Contact us",
        energySaving: "Energy Savings",
        logisticsFlow: "Logistics Flow",
        gridLoad: "Grid Load",
        zero: "Zero",
        monitoring: "AI Environmental Monitoring",
        internalTemp: "Internal Temp.",
        optimal: "Optimal",
        co2Offset: "CO₂ Offset",
        accredited: "Accredited",
        coldChainIntegrity: "Cold Chain Integrity",
        socialProof: "Designed for the global flower export industry",
        batch: "Batch",
        latestNewsBadge: "Latest",
        latestNewsTitle: "Latest News",
        latestNewsSubtitle: "A quick look at our latest updates and industry insights.",
        viewAllNews: "View all news",
        readArticle: "Read article",
        general: "General",
        latestNewsEmpty: "No news available yet.",
        comingSoon: "Coming soon",
        placeholderTitleA: "Cold Chain Innovation: What Comes Next",
        placeholderExcerptA: "We are preparing a technical brief on new passive cooling strategies for floral exports.",
        placeholderTitleB: "AI Monitoring in Logistics",
        placeholderExcerptB: "A practical update on real-time monitoring models for temperature-sensitive cargo.",
        heroChipA: "Live Farm Ops",
        heroChipB: "Passive Cooling",
        heroChipC: "Smart Logistics",
        heroPanelTitle: "Operational Snapshot",
        heroPanelSubtitle: "Real-time signals for export consistency",
        heroPanelTemp: "Cold Core Temperature",
        heroPanelIntegrity: "Chain Integrity",
        heroPanelFleet: "Connected Fleet",
        heroPanelStatus: "All systems stable",
        projectsBadge: "Innovation",
        projectsTitle: "Featured Projects",
        projectsSubtitle: "Real-world applications of our sustainable cooling technology.",
        viewAllProjects: "View all projects",
        viewProject: "View project",
        projectsEmpty: "No projects available yet.",
      }
    : {
        badge: "Comercio Global Ecológico",
        viewCatalog: "Ver Catálogo (Tecnología)",
        contactUs: "Contáctanos",
        energySaving: "Ahorro Energía",
        logisticsFlow: "Flujo Logístico",
        gridLoad: "Carga de Red",
        zero: "Cero",
        monitoring: "Monitoreo Ambiental con IA",
        internalTemp: "Temp. Interna",
        optimal: "Óptimo",
        co2Offset: "Compensación CO₂",
        accredited: "Acreditado",
        coldChainIntegrity: "Integridad de Cadena de Frío",
        socialProof: "Diseñado para la industria global de flores de exportación",
        batch: "Lote",
        latestNewsBadge: "Actualidad",
        latestNewsTitle: "Últimas Noticias",
        latestNewsSubtitle: "Una vista rápida de nuestras novedades y análisis recientes del sector.",
        viewAllNews: "Ver todas las noticias",
        readArticle: "Leer artículo",
        general: "General",
        latestNewsEmpty: "Aún no hay noticias publicadas.",
        comingSoon: "Próximamente",
        placeholderTitleA: "Innovación en cadena de frío: lo que viene",
        placeholderExcerptA: "Estamos preparando un informe técnico sobre nuevas estrategias de enfriamiento pasivo para exportación floral.",
        placeholderTitleB: "Monitoreo con IA en logística",
        placeholderExcerptB: "Una actualización práctica sobre modelos de monitoreo en tiempo real para carga sensible a temperatura.",
        heroChipA: "Operación en campo",
        heroChipB: "Enfriamiento pasivo",
        heroChipC: "Logística inteligente",
        heroPanelTitle: "Estado Operativo",
        heroPanelSubtitle: "Señales en tiempo real para exportación estable",
        heroPanelTemp: "Temperatura núcleo frío",
        heroPanelIntegrity: "Integridad de cadena",
        heroPanelFleet: "Flota conectada",
        heroPanelStatus: "Sistemas estables",
        projectsBadge: "Innovación",
        projectsTitle: "Proyectos Destacados",
        projectsSubtitle: "Aplicaciones reales de nuestra tecnología de enfriamiento sostenible.",
        viewAllProjects: "Ver todos los proyectos",
        viewProject: "Ver proyecto",
        projectsEmpty: "Aún no hay proyectos disponibles.",
      };

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
    <main className="flex min-h-screen flex-col items-center justify-between">
      <section className="relative w-full min-h-[90vh] md:min-h-[95vh] flex items-center pt-20 md:pt-24 pb-10 md:pb-16 overflow-hidden">
        {/* Video background — only on homepage hero */}
        <HeroVideoBackground />
        <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(2,6,16,0.78)_10%,rgba(2,6,16,0.30)_50%,rgba(2,6,16,0.74)_100%)] z-[1]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_30%,rgba(6,182,212,0.18),transparent_42%),radial-gradient(circle_at_85%_70%,rgba(16,185,129,0.16),transparent_36%)] z-[1]" />

        <div className="container mx-auto px-4 z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-end">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full border border-[var(--accent-cyan)]/50 bg-[var(--accent-cyan)]/15 text-[var(--accent-cyan)] font-semibold text-[10px] sm:text-xs mb-4 sm:mb-5 uppercase tracking-[0.14em]">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-cyan)] animate-pulse" />
              {t.badge}
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 sm:mb-5 leading-[1.1] tracking-tight text-white">
              {firstPart} {lastWords && <><br /><span className="text-gradient">{lastWords}</span></>}
            </h1>

            <p className="text-sm sm:text-lg md:text-xl text-gray-200/95 mb-5 sm:mb-7 max-w-xl leading-relaxed">
              {heroDescription}
            </p>

            <div className="flex flex-wrap gap-2 sm:gap-3 mb-6 sm:mb-8">
              <span className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-white/10 border border-white/15 text-[10px] sm:text-xs font-semibold text-gray-100">{t.heroChipA}</span>
              <span className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-white/10 border border-white/15 text-[10px] sm:text-xs font-semibold text-gray-100">{t.heroChipB}</span>
              <span className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-white/10 border border-white/15 text-[10px] sm:text-xs font-semibold text-gray-100">{t.heroChipC}</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link href="/proyectos" className="bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/90 text-white font-semibold px-6 py-3 sm:px-8 sm:py-4 rounded-xl transition-transform hover:-translate-y-1 shadow-[0_6px_24px_var(--accent-cyan-glow)] text-center text-sm sm:text-base">
                {t.viewCatalog}
              </Link>
              <Link href="/contacto" className="bg-black/35 border border-white/25 hover:border-white text-white font-semibold px-6 py-3 sm:px-8 sm:py-4 rounded-xl transition-transform hover:-translate-y-1 text-center backdrop-blur-md text-sm sm:text-base">
                {t.contactUs}
              </Link>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="absolute -inset-4 rounded-3xl bg-[radial-gradient(circle,rgba(6,182,212,0.22),transparent_70%)] blur-xl animate-pulse" />
            <div className="relative bg-black/45 border border-white/15 backdrop-blur-xl rounded-3xl p-6 md:p-7 shadow-2xl overflow-hidden">
              <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-[var(--accent-cyan)] via-[#2dd4bf] to-[var(--accent-green)]" />

              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--accent-cyan)] font-semibold">{t.heroPanelTitle}</p>
                  <p className="text-sm text-gray-300 mt-1">{t.heroPanelSubtitle}</p>
                </div>
                <div className="text-[11px] px-2.5 py-1 rounded-full bg-[var(--accent-green)]/15 border border-[var(--accent-green)]/40 text-[var(--accent-green)] font-semibold">
                  {t.heroPanelStatus}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between text-xs text-gray-400 uppercase tracking-wider mb-2">
                    <span>{t.heroPanelTemp}</span>
                    <span className="text-[var(--accent-cyan)] font-semibold">2.4°C</span>
                  </div>
                  <div className="h-2 rounded-full bg-black/40 overflow-hidden">
                    <div className="h-full w-[84%] bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-green)] animate-[pulse_2.8s_ease-in-out_infinite]" />
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between text-xs text-gray-400 uppercase tracking-wider mb-2">
                    <span>{t.heroPanelIntegrity}</span>
                    <span className="text-[var(--accent-green)] font-semibold">100%</span>
                  </div>
                  <div className="h-2 rounded-full bg-black/40 overflow-hidden">
                    <div className="h-full w-full bg-gradient-to-r from-[var(--accent-green)] to-[#34d399]" />
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between text-xs text-gray-400 uppercase tracking-wider mb-3">
                    <span>{t.heroPanelFleet}</span>
                    <span className="text-white font-semibold">89</span>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <span key={`fleet-dot-${index}`} className="h-2.5 rounded-full bg-[var(--accent-cyan)]/70 animate-pulse" style={{ animationDelay: `${index * 120}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Social Proof Section */}
      <section className="w-full py-10 md:py-16 bg-black/30 border-y border-white/5">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs sm:text-sm text-gray-400 uppercase tracking-widest mb-6 md:mb-8">{t.socialProof}</p>
          <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-8 md:gap-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Logos representativos genéricos o reales si los tuvieran */}
            <div className="text-lg sm:text-2xl font-bold font-serif">Expoflores</div>
            <div className="text-base sm:text-xl font-bold tracking-tighter">BPM Cargo</div>
            <div className="text-lg sm:text-2xl font-bold">AeroRoute</div>
            <div className="text-lg sm:text-2xl font-black italic">GLOBAL G.A.P.</div>
          </div>
        </div>
      </section>

      <section className="w-full py-12 md:py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8 md:mb-10">
            <div>
              <span className="inline-flex px-3 py-1 rounded-full border border-[var(--accent-green)]/25 bg-[var(--accent-green)]/10 text-[var(--accent-green)] text-xs font-semibold uppercase tracking-wider mb-3">
                {t.latestNewsBadge}
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white">{t.latestNewsTitle}</h2>
              <p className="text-gray-400 mt-2 max-w-2xl">{t.latestNewsSubtitle}</p>
            </div>
            <Link
              href="/noticias-principal"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]/80 transition-colors"
            >
              {t.viewAllNews}
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayArticles.map((article) => {
              const articleHref = article.id.startsWith("placeholder-") ? "/noticias-principal" : `/noticias-principal/${article.id}`;
              return (
              <Link key={article.id} href={articleHref} className="group bg-glass border border-white/10 rounded-2xl overflow-hidden hover:border-[var(--accent-cyan)]/40 transition-colors block">
                <div className="relative h-36 sm:h-44 bg-slate-900 overflow-hidden">
                  {article.img_url ? (
                    <NoticiaImage src={article.img_url} alt={article.title} />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <span className="absolute left-3 top-3 px-2.5 py-1 rounded-full bg-black/50 border border-white/10 text-[10px] font-bold tracking-wide uppercase text-[var(--accent-green)]">
                    {article.category || t.general}
                  </span>
                </div>

                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                    <Calendar size={12} />
                    <span>
                      {new Date(article.created_at).toLocaleDateString(lang === "en" ? "en-US" : "es-ES", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 group-hover:text-[var(--accent-cyan)] transition-colors">
                    {article.title}
                  </h3>
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

      {/* ── PROJECTS SECTION ── */}
      <section className="w-full py-12 md:py-20 border-t border-white/5">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8 md:mb-10">
            <div>
              <span className="inline-flex px-3 py-1 rounded-full border border-[var(--accent-cyan)]/25 bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] text-xs font-semibold uppercase tracking-wider mb-3">
                {t.projectsBadge}
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white">{t.projectsTitle}</h2>
              <p className="text-gray-400 mt-2 max-w-2xl">{t.projectsSubtitle}</p>
            </div>
            <Link
              href="/proyectos"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]/80 transition-colors"
            >
              {t.viewAllProjects}
              <ArrowRight size={16} />
            </Link>
          </div>

          {latestProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {latestProjects.map((project) => (
                <Link key={project.id} href="/proyectos" className="group bg-glass border border-white/10 rounded-2xl overflow-hidden hover:border-[var(--accent-cyan)]/40 transition-colors block">
                  <div className="relative h-36 sm:h-44 bg-slate-900 overflow-hidden">
                    {project.img_url ? (
                      <Image src={project.img_url} alt={project.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center text-4xl opacity-10">🏗️</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute left-3 top-3 flex gap-2">
                      {project.category && (
                        <span className="px-2.5 py-1 rounded-full bg-black/50 border border-white/10 text-[10px] font-bold tracking-wide uppercase text-[var(--accent-green)]">
                          {project.category}
                        </span>
                      )}
                      <span className="px-2.5 py-1 rounded-full bg-black/50 border border-white/10 text-[10px] font-bold tracking-wide uppercase text-[var(--accent-cyan)]">
                        {project.statusLabel}
                      </span>
                    </div>
                    {project.featured && (
                      <div className="absolute top-3 right-3">
                        <Star size={16} className="text-amber-400 fill-amber-400" />
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                      {project.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {project.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(project.created_at).toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 group-hover:text-[var(--accent-cyan)] transition-colors">
                      {project.title}
                    </h3>
                    {project.excerpt && (
                      <p className="text-sm text-gray-400 leading-relaxed line-clamp-3 mb-5">{project.excerpt}</p>
                    )}

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
              <div className="text-5xl mb-4 opacity-30">🏗️</div>
              <p className="text-gray-400">{t.projectsEmpty}</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
