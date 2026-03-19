import { createClient } from "@/utils/supabase/server";
import { getServerLanguage, pickLocalizedField } from "@/utils/i18n";
import { Star } from "lucide-react";
import ProyectosClient from "./ProyectosClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Proyectos",
  description: "Proyectos activos de Aphellium en tecnología de enfriamiento pasivo, logística sostenible y floricultura.",
  openGraph: {
    title: "Proyectos | Aphellium",
    description: "Explora los proyectos de innovación sostenible de Aphellium.",
  },
};

export const dynamic = "force-dynamic";

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
};

const STATUS_MAP: Record<string, { es: string; en: string; color: string }> = {
  planning: { es: "En Planificación", en: "Planning", color: "text-amber-300 bg-amber-500/15 border-amber-400/30" },
  active: { es: "En Curso", en: "Active", color: "text-emerald-300 bg-emerald-500/15 border-emerald-400/30" },
  completed: { es: "Completado", en: "Completed", color: "text-cyan-300 bg-cyan-500/15 border-cyan-400/30" },
  paused: { es: "Pausado", en: "Paused", color: "text-gray-400 bg-gray-500/15 border-gray-400/30" },
};

export default async function ProyectosPage() {
  const lang = await getServerLanguage();
  const supabase = await createClient();

  const { data: proyectos } = await supabase
    .from("proyectos")
    .select("*")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  const items: Proyecto[] = (proyectos || []) as Proyecto[];
  const categories = [...new Set(items.map(p => p.category).filter(Boolean))] as string[];

  const t = lang === "en"
    ? {
        title: "Our Projects",
        subtitle: "Proven innovation in the real world. Success stories transforming the global cold chain.",
        featured: "Featured Projects",
        all: "All Projects",
        allFilter: "All",
        viewDetails: "View Details",
        viewProject: "View Project",
        noProjects: "Projects coming soon. We're building the future of the cold chain.",
        location: "Location",
        client: "Client",
        status: "Status",
        dates: "Timeline",
        metrics: "Key Results",
        gallery: "Gallery",
        description: "About this Project",
        tags: "Technologies",
        filterBy: "Filter by category",
        resultsCount: "projects",
        loadMore: "Load more",
        testimonial: "\"Passive technology is the future. We reduced our cold-chain incident claims to zero in the last quarter.\"",
        testimonialAuthor: "— Agro-export sector client",
      }
    : {
        title: "Nuestros Proyectos",
        subtitle: "Innovación comprobada en el mundo real. Casos de éxito que transforman la cadena de frío global.",
        featured: "Proyectos Destacados",
        all: "Todos los Proyectos",
        allFilter: "Todos",
        viewDetails: "Ver Detalles",
        viewProject: "Ver Proyecto",
        noProjects: "Proyectos próximamente. Estamos construyendo el futuro de la cadena de frío.",
        location: "Ubicación",
        client: "Cliente",
        status: "Estado",
        dates: "Periodo",
        metrics: "Resultados Clave",
        gallery: "Galería",
        description: "Sobre este Proyecto",
        tags: "Tecnologías",
        filterBy: "Filtrar por categoría",
        resultsCount: "proyectos",
        loadMore: "Cargar más",
        testimonial: "\"La tecnología pasiva es el futuro. Redujimos nuestros reclamos por cortes de frío a cero en el último trimestre.\"",
        testimonialAuthor: "— Cliente del sector agroexportador",
      };

  // Prepare projects with localized fields
  const localizedItems = items.map(p => ({
    ...p,
    _title: pickLocalizedField(p, "title", lang) || p.title,
    _excerpt: pickLocalizedField(p, "excerpt", lang) || p.excerpt,
    _description: pickLocalizedField(p, "description", lang) || p.description,
    _category: pickLocalizedField(p, "category", lang) || p.category,
    _statusLabel: STATUS_MAP[p.status]?.[lang] || p.status,
    _statusColor: STATUS_MAP[p.status]?.color || "",
  }));

  return (
    <main className="flex min-h-screen flex-col items-center">
      {/* Hero Header */}
      <section className="relative w-full pt-24 md:pt-32 pb-16 md:pb-24 overflow-hidden bg-[var(--bg-darker)] border-b border-white/5">
        <div className="absolute top-0 left-0 w-[60vw] h-[60vw] bg-[var(--accent-cyan)]/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[40vw] h-[40vw] bg-[var(--accent-green)]/5 rounded-full blur-[100px] -z-10 pointer-events-none" />

        <div className="container mx-auto px-4 text-center z-10 relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] text-xs font-medium mb-6">
            <Star size={14} className="fill-current" />
            {items.length} {t.resultsCount}
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold mb-5 tracking-tight leading-tight">
            {t.title.split(" ")[0]}{" "}
            <span className="text-gradient">{t.title.split(" ").slice(1).join(" ")}</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            {t.subtitle}
          </p>
        </div>
      </section>

      {items.length === 0 ? (
        <section className="w-full py-20 text-center">
          <div className="container mx-auto px-4">
            <div className="max-w-md mx-auto bg-black/40 border border-white/10 rounded-2xl p-8 backdrop-blur-md">
              <div className="text-5xl mb-4 opacity-30">🏗️</div>
              <p className="text-gray-400">{t.noProjects}</p>
            </div>
          </div>
        </section>
      ) : (
        <ProyectosClient
          projects={localizedItems}
          categories={categories}
          labels={t}
          lang={lang}
        />
      )}

      {/* Testimonial */}
      <section className="w-full py-16 bg-[var(--bg-darker)] border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="p-8 rounded-2xl bg-glass border border-white/5">
              <p className="text-sm md:text-base text-gray-400 italic mb-3 leading-relaxed">
                {t.testimonial}
              </p>
              <p className="text-xs text-[var(--accent-cyan)] font-bold uppercase tracking-widest">
                {t.testimonialAuthor}
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
