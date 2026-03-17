import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import NoticiasGridClient from "@/components/NoticiasGridClient";
import { getServerLanguage } from "@/utils/i18n";
import { pickLocalizedField } from "@/utils/i18n";
import { translateText } from "@/utils/autoTranslate";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Noticias",
  description: "Las últimas noticias y novedades en tecnología de enfriamiento sostenible, logística y floricultura.",
  openGraph: {
    title: "Noticias | Aphellium",
    description: "Novedades de Aphellium Sustainable Technologies.",
  },
};

interface Noticia {
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

export default async function NoticiasMainPage() {
  const lang = await getServerLanguage();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = !!user;

  const { data: articles } = await supabase
    .from("noticias")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Noticia[]>();

  const t = lang === "en"
    ? {
        title: "News & Updates",
        subtitle: "Stay up to date with the latest advances in passive cooling and sustainable logistics.",
        general: "General",
        editorialTeam: "Editorial Team",
        readArticle: "Read article",
        empty: "No news published yet.",
        loadMore: "Load more news",
      }
    : {
        title: "Noticias y Novedades",
        subtitle: "Mantente al día con los últimos avances en tecnología de enfriamiento pasivo y logística sostenible.",
        general: "General",
        editorialTeam: "Equipo Editorial",
        readArticle: "Leer artículo",
        empty: "No hay noticias publicadas por el momento.",
        loadMore: "Cargar más noticias",
      };

  const localizedArticles = articles
    ? await Promise.all(
        articles.map(async (article) => {
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

  return (
    <main className="flex min-h-screen flex-col items-center">
      {/* Header */}
      <section className="relative w-full pt-24 md:pt-32 pb-12 md:pb-20 overflow-hidden bg-[var(--bg-darker)] border-b border-white/5">
         <div className="absolute top-0 right-1/4 w-[40vw] h-[40vw] bg-[var(--accent-green)]/5 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
        <div className="container mx-auto px-4 text-center z-10">
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold mb-4 tracking-tight">
            {lang === "en" ? "News &" : "Noticias y"} <span className="text-gradient">{lang === "en" ? "Updates" : "Novedades"}</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
            {t.subtitle}
          </p>
        </div>
      </section>

      {/* Feed de Noticias */}
      <section className="w-full py-12 md:py-20 pb-20 md:pb-32">
        <div className="container mx-auto px-4 max-w-5xl">
          <NoticiasGridClient articles={localizedArticles} isAdmin={isAdmin} lang={lang} t={t} />
        </div>
      </section>
    </main>
  );
}
