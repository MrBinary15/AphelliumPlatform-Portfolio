"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Calendar, User } from "lucide-react";
import NoticiaImage from "@/components/NoticiaImage";
import DeleteNoticiaButton from "@/components/DeleteNoticiaButton";

type LocalizedNoticia = {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  img_url: string;
  created_at: string;
};

type NoticiasGridClientProps = {
  articles: LocalizedNoticia[];
  lang: "es" | "en";
  isAdmin: boolean;
  t: {
    readArticle: string;
    editorialTeam: string;
    empty: string;
    general: string;
    loadMore: string;
  };
};

const PAGE_SIZE = 6;

export default function NoticiasGridClient({ articles, lang, isAdmin, t }: NoticiasGridClientProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visibleArticles = useMemo(() => articles.slice(0, visibleCount), [articles, visibleCount]);
  const hasMore = visibleCount < articles.length;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
        {visibleArticles.length > 0 ? (
          visibleArticles.map((article) => (
            <article
              key={article.id}
              className="group card-premium overflow-hidden flex flex-col"
            >
              <div className="relative h-48 bg-gray-900 w-full overflow-hidden">
                <NoticiaImage src={article.img_url} alt={article.title} />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-dark)] to-transparent z-10"></div>
                <div className="absolute top-4 left-4 z-20">
                  <span className="px-3 py-1 bg-black/50 backdrop-blur-md rounded-full text-[10px] font-bold tracking-wider text-[var(--accent-green)] border border-white/10 uppercase">
                    {article.category || t.general}
                  </span>
                </div>
                {isAdmin && (
                  <div className="absolute top-4 right-4 z-30">
                    <DeleteNoticiaButton id={article.id} title={article.title} />
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-6 flex-grow flex flex-col">
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3 font-medium">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(article.created_at).toLocaleDateString(lang === "en" ? "en-US" : "es-ES", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <User size={12} /> {t.editorialTeam}
                  </span>
                </div>

                <h3 className="text-xl font-bold mb-3 group-hover:text-[var(--accent-cyan)] transition-colors line-clamp-2">
                  {article.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-6 line-clamp-3">{article.excerpt}</p>

                <div className="mt-auto pt-4 border-t border-white/5">
                  <Link
                    href={`/noticias-principal/${article.id}`}
                    className="inline-flex items-center text-sm font-bold text-white group-hover:text-[var(--accent-cyan)] transition-colors"
                  >
                    {t.readArticle}
                    <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="col-span-full py-20 text-center text-gray-400">
            <p>{t.empty}</p>
          </div>
        )}
      </div>

      {hasMore && (
        <div className="mt-12 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            className="btn-glass px-6 py-3 text-sm font-semibold text-white"
          >
            {t.loadMore}
          </button>
        </div>
      )}
    </>
  );
}
