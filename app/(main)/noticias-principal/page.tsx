import Link from "next/link";
import { ArrowRight, Calendar, User } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import NoticiaImage from "@/components/NoticiaImage";
import DeleteNoticiaButton from "@/components/DeleteNoticiaButton";

interface Noticia {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  img_url: string;
  created_at: string;
}

export default async function NoticiasMainPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = !!user;

  const { data: articles } = await supabase
    .from("noticias")
    .select("id, title, excerpt, category, img_url, created_at")
    .order("created_at", { ascending: false })
    .returns<Noticia[]>();

  return (
    <main className="flex min-h-screen flex-col items-center">
      {/* Header */}
      <section className="relative w-full pt-32 pb-20 overflow-hidden bg-[var(--bg-darker)] border-b border-white/5">
         <div className="absolute top-0 right-1/4 w-[40vw] h-[40vw] bg-[var(--accent-green)]/5 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
        <div className="container mx-auto px-4 text-center z-10">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
            Noticias y <span className="text-gradient">Novedades</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Mantente al día con los últimos avances en tecnología de enfriamiento pasivo y logística sostenible.
          </p>
        </div>
      </section>

      {/* Feed de Noticias */}
      <section className="w-full py-20 pb-32">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles && articles.length > 0 ? articles.map((article) => (
              <article key={article.id} className="group bg-glass rounded-2xl border border-white/5 overflow-hidden flex flex-col hover:border-[var(--accent-cyan)]/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_40px_-15px_rgba(0,186,224,0.1)]">
                <div className="relative h-48 bg-gray-900 w-full overflow-hidden">
                  <NoticiaImage src={article.img_url} alt={article.title} />
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-dark)] to-transparent z-10"></div>
                  <div className="absolute top-4 left-4 z-20">
                     <span className="px-3 py-1 bg-black/50 backdrop-blur-md rounded-full text-[10px] font-bold tracking-wider text-[var(--accent-green)] border border-white/10 uppercase">
                        {article.category || "General"}
                     </span>
                  </div>
                  {isAdmin && (
                    <div className="absolute top-4 right-4 z-30">
                      <DeleteNoticiaButton id={article.id} title={article.title} />
                    </div>
                  )}
                </div>
                <div className="p-6 flex-grow flex flex-col">
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-3 font-medium">
                    <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(article.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    <span className="flex items-center gap-1"><User size={12} /> Equipo Editorial</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 group-hover:text-[var(--accent-cyan)] transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-6 line-clamp-3">
                    {article.excerpt}
                  </p>
                  <div className="mt-auto pt-4 border-t border-white/5">
                    <Link href={`/noticias-principal/${article.id}`} className="inline-flex items-center text-sm font-bold text-white group-hover:text-[var(--accent-cyan)] transition-colors">
                      Leer artículo <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </article>
            )) : (
              <div className="col-span-full py-20 text-center text-gray-400">
                <p>No hay noticias publicadas por el momento.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
