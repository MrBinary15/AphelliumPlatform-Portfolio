import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Building2,
  BarChart3,
  Tag,
  ImageIcon,
  Star,
  ArrowRight,
  Clock,
} from "lucide-react";
import { getServerLanguage, pickLocalizedField } from "@/utils/i18n";
import type { Metadata } from "next";

/* ─── Types ─── */
type Proyecto = {
  id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  description: string | null;
  category: string | null;
  status: string;
  img_url: string | null;
  client_name: string | null;
  client_type: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  metrics: { label: string; value: string }[];
  gallery: string[];
  tags: string[];
  featured: boolean;
  title_es: string | null;
  title_en: string | null;
  excerpt_es: string | null;
  excerpt_en: string | null;
  description_es: string | null;
  description_en: string | null;
  category_es: string | null;
  category_en: string | null;
  created_at: string;
  updated_at: string;
};

/* ─── Helpers ─── */
const STATUS_MAP: Record<string, { es: string; en: string; color: string }> = {
  planning: { es: "En Planificación", en: "Planning", color: "text-amber-300 bg-amber-500/15 border-amber-400/30" },
  active: { es: "En Curso", en: "Active", color: "text-emerald-300 bg-emerald-500/15 border-emerald-400/30" },
  completed: { es: "Completado", en: "Completed", color: "text-cyan-300 bg-cyan-500/15 border-cyan-400/30" },
  paused: { es: "Pausado", en: "Paused", color: "text-gray-400 bg-gray-500/15 border-gray-400/30" },
};

function formatDate(value: string | null, lang: "es" | "en"): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(lang === "en" ? "en-US" : "es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-EC", { month: "short", year: "numeric" });
}

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<link[\s\S]*?>/gi, "")
    .replace(/<meta[\s\S]*?>/gi, "")
    .replace(/\son\w+=("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(srcdoc|formaction)=("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/data:\s*text\/html/gi, "");
}

function getClientDisplay(proyecto: Proyecto): string {
  if (proyecto.client_type === "propio") return "Proyecto propio";
  return proyecto.client_name || "";
}

/* ─── Data fetching ─── */
async function fetchProyecto(id: string): Promise<Proyecto | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proyectos")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as Proyecto;
}

async function fetchRelatedProjects(currentId: string, category: string | null): Promise<Proyecto[]> {
  const supabase = await createClient();
  let query = supabase
    .from("proyectos")
    .select("id, title, slug, img_url, excerpt, category, status, featured, title_es, title_en, excerpt_es, excerpt_en, category_es, category_en, created_at")
    .neq("id", currentId)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(3);

  if (category) {
    query = query.eq("category", category);
  }

  const { data } = await query;

  // If not enough same-category, fill with others
  if ((data?.length || 0) < 3 && category) {
    const existingIds = (data || []).map(p => p.id);
    const { data: others } = await supabase
      .from("proyectos")
      .select("id, title, slug, img_url, excerpt, category, status, featured, title_es, title_en, excerpt_es, excerpt_en, category_es, category_en, created_at")
      .neq("id", currentId)
      .not("id", "in", `(${existingIds.join(",")})`)
      .order("created_at", { ascending: false })
      .limit(3 - (data?.length || 0));
    return [...(data || []), ...(others || [])] as Proyecto[];
  }

  return (data || []) as Proyecto[];
}

/* ─── Metadata ─── */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const proyecto = await fetchProyecto(id);
  if (!proyecto) return { title: "Proyecto no encontrado" };

  return {
    title: proyecto.title,
    description: (proyecto.excerpt || proyecto.title || "").slice(0, 160),
    openGraph: {
      title: proyecto.title,
      description: (proyecto.excerpt || proyecto.title || "").slice(0, 160),
      images: proyecto.img_url ? [proyecto.img_url] : [],
    },
  };
}

/* ─── Page ─── */
export default async function ProyectoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const lang = await getServerLanguage();
  const { id } = await params;
  const proyecto = await fetchProyecto(id);

  if (!proyecto) notFound();

  const related = await fetchRelatedProjects(id, proyecto.category);

  const title = pickLocalizedField(proyecto, "title", lang, { fallbackToBase: true }) || proyecto.title;
  const excerpt = pickLocalizedField(proyecto, "excerpt", lang, { fallbackToBase: true }) || proyecto.excerpt || "";
  const description = pickLocalizedField(proyecto, "description", lang, { fallbackToBase: true }) || proyecto.description || "";
  const category = pickLocalizedField(proyecto, "category", lang, { fallbackToBase: true }) || proyecto.category || "";
  const statusInfo = STATUS_MAP[proyecto.status] || STATUS_MAP.active;
  const statusLabel = statusInfo[lang];
  const statusColor = statusInfo.color;
  const clientDisplay = getClientDisplay(proyecto);
  const safeDescription = sanitizeHtml(description);
  const createdDate = formatDate(proyecto.created_at, lang);
  const updatedDate = formatDate(proyecto.updated_at, lang);

  const t = lang === "en"
    ? {
        back: "Back to Projects",
        about: "About this Project",
        keyResults: "Key Results",
        gallery: "Project Gallery",
        technologies: "Technologies & Tags",
        timeline: "Timeline",
        location: "Location",
        client: "Client",
        status: "Status",
        published: "Published",
        lastUpdate: "Last update",
        relatedTitle: "Related Projects",
        relatedSubtitle: "Explore more of our work",
        viewProject: "View project",
        ctaTitle: "Interested in a project like this?",
        ctaText: "Contact us to discuss how we can help you achieve similar results.",
        ctaButton: "Contact Us",
      }
    : {
        back: "Volver a Proyectos",
        about: "Sobre este Proyecto",
        keyResults: "Resultados Clave",
        gallery: "Galería del Proyecto",
        technologies: "Tecnologías y Etiquetas",
        timeline: "Periodo",
        location: "Ubicación",
        client: "Cliente",
        status: "Estado",
        published: "Publicado",
        lastUpdate: "Última actualización",
        relatedTitle: "Proyectos Relacionados",
        relatedSubtitle: "Explora más de nuestro trabajo",
        viewProject: "Ver proyecto",
        ctaTitle: "¿Interesado en un proyecto como este?",
        ctaText: "Contáctanos para discutir cómo podemos ayudarte a lograr resultados similares.",
        ctaButton: "Contáctanos",
      };

  return (
    <main className="flex min-h-screen flex-col items-center pb-20">
      {/* ═══ Hero Section ═══ */}
      <div className="w-full relative h-[40vh] sm:h-[45vh] md:h-[55vh] bg-gray-900 border-b border-white/5">
        {proyecto.img_url ? (
          <Image
            src={proyecto.img_url}
            alt={title}
            fill
            className="object-cover opacity-50"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-dark)] via-[var(--bg-dark)]/70 to-transparent" />

        <div className="absolute bottom-0 w-full left-0 z-10">
          <div className="container mx-auto px-4 pb-8 sm:pb-12 max-w-5xl">
            <Link
              href="/proyectos"
              className="inline-flex items-center text-sm text-[var(--accent-cyan)] hover:brightness-125 mb-5 transition-colors font-medium"
            >
              <ArrowLeft size={16} className="mr-2" /> {t.back}
            </Link>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              {category && (
                <span className="px-3 py-1 bg-[var(--accent-green)]/10 text-[var(--accent-green)] rounded-full text-xs font-bold tracking-wider uppercase border border-[var(--accent-green)]/20">
                  {category}
                </span>
              )}
              <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider border ${statusColor}`}>
                {statusLabel}
              </span>
              {proyecto.featured && (
                <span className="px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full text-xs font-bold tracking-wider border border-amber-400/20 inline-flex items-center gap-1">
                  <Star size={12} className="fill-current" /> Destacado
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold mb-5 leading-tight">
              {title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-400 font-medium">
              {proyecto.location && (
                <span className="flex items-center gap-2">
                  <MapPin size={14} className="text-[var(--accent-cyan)]" />
                  {proyecto.location}
                </span>
              )}
              {clientDisplay && (
                <span className="flex items-center gap-2">
                  <Building2 size={14} className="text-[var(--accent-cyan)]" />
                  {clientDisplay}
                </span>
              )}
              {(proyecto.start_date || proyecto.end_date) && (
                <span className="flex items-center gap-2">
                  <Calendar size={14} className="text-[var(--accent-cyan)]" />
                  {formatShortDate(proyecto.start_date)} – {formatShortDate(proyecto.end_date)}
                </span>
              )}
              {createdDate && (
                <span className="flex items-center gap-2">
                  <Clock size={14} className="text-[var(--accent-cyan)]" />
                  {createdDate}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Content Area ═══ */}
      <section className="container mx-auto px-4 max-w-5xl mt-8 sm:mt-12 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 lg:gap-12">
          {/* ─── Main Content ─── */}
          <div className="space-y-10 min-w-0">
            {/* Excerpt */}
            {excerpt && (
              <p className="text-base sm:text-xl text-gray-300 font-medium leading-relaxed border-l-4 border-[var(--accent-cyan)] pl-4 sm:pl-6">
                {excerpt}
              </p>
            )}

            {/* Key Metrics */}
            {proyecto.metrics && proyecto.metrics.length > 0 && (
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-white mb-4">
                  <BarChart3 size={18} className="text-[var(--accent-green)]" />
                  {t.keyResults}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {proyecto.metrics.map((m, i) => (
                    <div
                      key={i}
                      className="bg-white/5 rounded-2xl p-4 border border-white/5 text-center hover:border-[var(--accent-cyan)]/20 transition-colors"
                    >
                      <span className="block text-2xl sm:text-3xl font-black text-white mb-1">{m.value}</span>
                      <span className="text-xs text-gray-500">{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rich Description */}
            {safeDescription && (
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-white mb-4">
                  <BarChart3 size={18} className="text-[var(--accent-cyan)]" />
                  {t.about}
                </h2>
                <div
                  className="prose prose-sm sm:prose-base prose-invert prose-p:text-gray-300 prose-headings:text-white prose-a:text-[var(--accent-cyan)] prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-img:border prose-img:border-white/10 prose-img:max-w-full prose-video:rounded-xl prose-video:w-full prose-video:aspect-video max-w-none break-words [&_iframe]:max-w-full [&_iframe]:w-full"
                  dangerouslySetInnerHTML={{ __html: safeDescription }}
                />
              </div>
            )}

            {/* Gallery */}
            {proyecto.gallery && proyecto.gallery.length > 0 && (
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-white mb-4">
                  <ImageIcon size={18} className="text-[var(--accent-green)]" />
                  {t.gallery}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {proyecto.gallery.map((url, i) => (
                    <div
                      key={i}
                      className="relative aspect-video rounded-xl overflow-hidden bg-gray-900 border border-white/5 hover:border-white/20 transition-all duration-200 group"
                    >
                      <Image
                        src={url}
                        alt={`${title} — ${i + 1}`}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Technologies / Tags */}
            {proyecto.tags && proyecto.tags.length > 0 && (
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-white mb-4">
                  <Tag size={18} className="text-[var(--accent-cyan)]" />
                  {t.technologies}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {proyecto.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 rounded-xl bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] text-sm font-medium border border-[var(--accent-cyan)]/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ─── Sidebar ─── */}
          <aside className="space-y-6">
            {/* Project Info Card */}
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-4 sticky top-24">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-3">
                {lang === "en" ? "Project Details" : "Detalles del Proyecto"}
              </h3>

              <div className="space-y-3">
                {/* Status */}
                <div>
                  <span className="text-[11px] text-gray-500 uppercase tracking-wider">{t.status}</span>
                  <div className="mt-1">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold tracking-wider border ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </div>
                </div>

                {/* Category */}
                {category && (
                  <div>
                    <span className="text-[11px] text-gray-500 uppercase tracking-wider">
                      {lang === "en" ? "Category" : "Categoría"}
                    </span>
                    <p className="text-sm text-white mt-0.5">{category}</p>
                  </div>
                )}

                {/* Location */}
                {proyecto.location && (
                  <div>
                    <span className="text-[11px] text-gray-500 uppercase tracking-wider">{t.location}</span>
                    <p className="text-sm text-white mt-0.5 flex items-center gap-1.5">
                      <MapPin size={13} className="text-gray-500" /> {proyecto.location}
                    </p>
                  </div>
                )}

                {/* Client */}
                {clientDisplay && (
                  <div>
                    <span className="text-[11px] text-gray-500 uppercase tracking-wider">{t.client}</span>
                    <p className="text-sm text-white mt-0.5 flex items-center gap-1.5">
                      <Building2 size={13} className="text-gray-500" /> {clientDisplay}
                    </p>
                  </div>
                )}

                {/* Timeline */}
                {(proyecto.start_date || proyecto.end_date) && (
                  <div>
                    <span className="text-[11px] text-gray-500 uppercase tracking-wider">{t.timeline}</span>
                    <p className="text-sm text-white mt-0.5 flex items-center gap-1.5">
                      <Calendar size={13} className="text-gray-500" />
                      {formatShortDate(proyecto.start_date)} – {formatShortDate(proyecto.end_date)}
                    </p>
                  </div>
                )}

                {/* Published */}
                {createdDate && (
                  <div>
                    <span className="text-[11px] text-gray-500 uppercase tracking-wider">{t.published}</span>
                    <p className="text-sm text-gray-400 mt-0.5">{createdDate}</p>
                  </div>
                )}

                {/* Last update */}
                {updatedDate && updatedDate !== createdDate && (
                  <div>
                    <span className="text-[11px] text-gray-500 uppercase tracking-wider">{t.lastUpdate}</span>
                    <p className="text-sm text-gray-400 mt-0.5">{updatedDate}</p>
                  </div>
                )}
              </div>

              {/* CTA in sidebar */}
              <div className="border-t border-white/10 pt-4">
                <Link
                  href="/contacto"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--accent-cyan)] text-black font-bold text-sm hover:bg-[var(--accent-cyan)]/85 transition-all"
                >
                  {t.ctaButton} <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* ═══ Related Projects ═══ */}
      {related.length > 0 && (
        <section className="w-full mt-16 pt-12 border-t border-white/5">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">{t.relatedTitle}</h2>
              <p className="text-gray-500 text-sm">{t.relatedSubtitle}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {related.map((r) => {
                const rTitle = pickLocalizedField(r, "title", lang, { fallbackToBase: true }) || r.title;
                const rExcerpt = pickLocalizedField(r, "excerpt", lang, { fallbackToBase: true }) || r.excerpt || "";
                const rCategory = pickLocalizedField(r, "category", lang, { fallbackToBase: true }) || r.category || "";
                const rStatus = STATUS_MAP[r.status] || STATUS_MAP.active;

                return (
                  <Link
                    key={r.id}
                    href={`/proyectos/${r.id}`}
                    className="group rounded-2xl overflow-hidden bg-white/[0.02] border border-white/5 hover:border-[var(--accent-cyan)]/30 transition-all duration-300 hover:-translate-y-1 flex flex-col"
                  >
                    <div className="relative h-40 bg-gray-900 overflow-hidden">
                      {r.img_url ? (
                        <Image
                          src={r.img_url}
                          alt={rTitle}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-10">🏗️</div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-dark)] to-transparent" />
                      <div className="absolute top-3 left-3 flex gap-1.5 z-10">
                        {rCategory && (
                          <span className="px-2 py-0.5 bg-black/50 backdrop-blur-md rounded-full text-[10px] font-bold text-[var(--accent-green)] border border-white/10 uppercase">
                            {rCategory}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-md ${rStatus.color}`}>
                          {rStatus[lang]}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="text-base font-bold mb-2 line-clamp-2 group-hover:text-[var(--accent-cyan)] transition-colors">
                        {rTitle}
                      </h3>
                      {rExcerpt && (
                        <p className="text-gray-400 text-xs mb-3 line-clamp-2">{rExcerpt}</p>
                      )}
                      <span className="mt-auto inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent-cyan)]">
                        {t.viewProject} <ArrowRight size={12} />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══ CTA Banner ═══ */}
      <section className="w-full mt-16 py-16 bg-[var(--bg-darker)] border-t border-white/5">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">{t.ctaTitle}</h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">{t.ctaText}</p>
          <Link
            href="/contacto"
            className="inline-flex items-center gap-2 bg-[var(--accent-cyan)] text-black font-bold px-8 py-4 rounded-xl hover:bg-[var(--accent-cyan)]/85 transition-all hover:-translate-y-0.5 shadow-[0_8px_32px_var(--accent-cyan-glow)]"
          >
            {t.ctaButton} <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}
