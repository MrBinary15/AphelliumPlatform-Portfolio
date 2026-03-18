import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, ExternalLink, User } from "lucide-react";
import NoticiaImage from "@/components/NoticiaImage";
import SocialEmbed from "@/components/SocialEmbed";
import { getServerLanguage } from "@/utils/i18n";
import { pickLocalizedField } from "@/utils/i18n";
import { translateText } from "@/utils/autoTranslate";
import DOMPurify from "isomorphic-dompurify";
import type { Metadata } from "next";

function resolveArticleLink(article: Record<string, unknown>): string {
  const candidates = ["link", "source_url", "external_url", "url_publicacion"];
  for (const key of candidates) {
    const value = article[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
}

function resolveArticleEmbed(article: Record<string, unknown>): string {
  const candidates = ["embed", "embed_code", "embed_html", "oembed_html"];
  for (const key of candidates) {
    const value = article[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  const content = article["content"];
  if (typeof content === "string") {
    const iframeMatch = content.match(/<iframe[\s\S]*?<\/iframe>/i);
    if (iframeMatch?.[0]) {
      return iframeMatch[0].trim();
    }
  }

  return "";
}

function stripEmbedIframes(html: string): string {
  return html.replace(/<iframe[\s\S]*?<\/iframe>/gi, "").trim();
}

function hasInlineEmbedInContent(html: string): boolean {
  return /<iframe[\s\S]*?<\/iframe>/i.test(html);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: article } = await supabase
    .from("noticias")
    .select("title, excerpt, img_url")
    .eq("id", id)
    .single();

  if (!article) return { title: "Noticia no encontrada" };

  return {
    title: article.title,
    description: article.excerpt?.slice(0, 160) || article.title,
    openGraph: {
      title: article.title,
      description: article.excerpt?.slice(0, 160) || article.title,
      images: article.img_url ? [article.img_url] : [],
    },
  };
}

export default async function NoticiaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const lang = await getServerLanguage();
  const { id } = await params;
  const supabase = await createClient();
  let article = null;
  let errorMsg = "";
  try {
    const { data, error } = await supabase
      .from("noticias")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      errorMsg = `Error al consultar la noticia: ${error.message}`;
    }
    article = data;
  } catch (err) {
    errorMsg = `Error inesperado: ${err?.message || err}`;
  }
  if (!article) {
    if (errorMsg) {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center">
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-6 text-center text-red-200 max-w-lg mx-auto mt-20">
            <h2 className="text-xl font-bold mb-4">No se pudo cargar la noticia</h2>
            <p>{errorMsg}</p>
            <Link href="/noticias-principal" className="mt-6 inline-block text-[var(--accent-cyan)] font-semibold">Volver a Noticias</Link>
          </div>
        </main>
      );
    }
    notFound();
  }

  const localizedTitle =
    pickLocalizedField(article as Record<string, unknown>, "title", lang, { fallbackToBase: false }) ||
    (await translateText(article.title || "", lang));
  const localizedCategory =
    pickLocalizedField(article as Record<string, unknown>, "category", lang, { fallbackToBase: false }) ||
    (await translateText(article.category || "", lang));
  const localizedExcerpt =
    pickLocalizedField(article as Record<string, unknown>, "excerpt", lang, { fallbackToBase: false }) ||
    (await translateText(article.excerpt || "", lang));
  const localizedContent =
    pickLocalizedField(article as Record<string, unknown>, "content", lang, { fallbackToBase: false }) ||
    (await translateText(article.content || "", lang));
  const articleLink = resolveArticleLink(article as Record<string, unknown>);
  const articleEmbed = resolveArticleEmbed(article as Record<string, unknown>);
  const hasInlineEmbed = hasInlineEmbedInContent(localizedContent);
  const rawContent = hasInlineEmbed ? localizedContent : stripEmbedIframes(localizedContent);
  const renderedContent = DOMPurify.sanitize(rawContent, {
    ADD_TAGS: ["iframe"],
    ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling", "target", "loading", "referrerpolicy"],
  });

  const t = lang === "en"
    ? {
        back: "Back to News",
        general: "General",
        team: "Editorial Team",
      }
    : {
        back: "Volver a Noticias",
        general: "General",
        team: "Equipo Editorial",
      };

  return (
    <main className="flex min-h-screen flex-col items-center pb-20">
      {/* Hero Image / Header */}
      <div className="w-full relative h-[35vh] sm:h-[40vh] md:h-[50vh] bg-gray-900 border-b border-white/5">
        <NoticiaImage src={article.img_url} alt={localizedTitle} className="opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-dark)] via-[var(--bg-dark)]/80 to-transparent"></div>
        
        <div className="absolute bottom-0 w-full left-0 z-10">
          <div className="container mx-auto px-4 pb-8 sm:pb-12 max-w-4xl">
            <Link href="/noticias-principal" className="inline-flex items-center text-sm text-[var(--accent-cyan)] hover:brightness-125 mb-4 sm:mb-6 transition-colors font-medium">
              <ArrowLeft size={16} className="mr-2" /> {t.back}
            </Link>
            
            <div className="mb-4">
              <span className="px-3 py-1 bg-[var(--accent-green)]/10 text-[var(--accent-green)] rounded-full text-xs font-bold tracking-wider uppercase border border-[var(--accent-green)]/20">
                {localizedCategory || t.general}
              </span>
            </div>
            
            <h1 className="text-xl sm:text-2xl md:text-5xl font-extrabold mb-4 sm:mb-6 leading-tight">
              {localizedTitle}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-400 font-medium">
              <span className="flex items-center gap-2">
                <Calendar size={14} className="text-[var(--accent-cyan)]" /> 
                {new Date(article.created_at).toLocaleDateString(lang === "en" ? 'en-US' : 'es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
              <span className="flex items-center gap-2">
                <User size={14} className="text-[var(--accent-cyan)]" /> 
                {t.team}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <section className="container mx-auto px-4 max-w-4xl mt-8 sm:mt-12 w-full">
        {localizedExcerpt && (
          <p className="text-base sm:text-xl text-gray-300 font-medium leading-relaxed mb-8 sm:mb-12 border-l-4 border-[var(--accent-cyan)] pl-4 sm:pl-6">
            {localizedExcerpt}
          </p>
        )}

        {!hasInlineEmbed && (articleLink || articleEmbed) && <SocialEmbed url={articleLink} embedHtml={articleEmbed} />}
        
        <div 
          className="prose prose-sm sm:prose-base prose-invert prose-p:text-gray-300 prose-headings:text-white prose-a:text-[var(--accent-cyan)] prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-img:border prose-img:border-white/10 prose-img:max-w-full prose-video:rounded-xl prose-video:w-full prose-video:aspect-video max-w-none break-words [&_iframe]:max-w-full [&_iframe]:w-full"
          dangerouslySetInnerHTML={{ __html: renderedContent }}
        />

        {articleLink && (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-gray-400 mb-3">{lang === "en" ? "Publication link (optional)" : "Enlace de publicacion (opcional)"}</p>
            <a
              href={articleLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent-cyan)] text-black px-4 py-2.5 font-semibold hover:bg-[var(--accent-cyan)]/90 transition-colors"
            >
              {lang === "en" ? "Open original publication" : "Abrir publicacion original"}
              <ExternalLink size={16} />
            </a>
          </div>
        )}
      </section>
    </main>
  );
}
