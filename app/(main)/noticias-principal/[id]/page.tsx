import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, User } from "lucide-react";
import NoticiaImage from "@/components/NoticiaImage";

export default async function NoticiaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: article } = await supabase
    .from("noticias")
    .select("*")
    .eq("id", id)
    .single();

  if (!article) {
    notFound();
  }

  return (
    <main className="flex min-h-screen flex-col items-center pb-20">
      {/* Hero Image / Header */}
      <div className="w-full relative h-[40vh] md:h-[50vh] bg-gray-900 border-b border-white/5">
        <NoticiaImage src={article.img_url} alt={article.title} className="opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-dark)] via-[var(--bg-dark)]/80 to-transparent"></div>
        
        <div className="absolute bottom-0 w-full left-0 z-10">
          <div className="container mx-auto px-4 pb-12 max-w-4xl">
            <Link href="/noticias" className="inline-flex items-center text-sm text-[var(--accent-cyan)] hover:brightness-125 mb-6 transition-colors font-medium">
              <ArrowLeft size={16} className="mr-2" /> Volver a Noticias
            </Link>
            
            <div className="mb-4">
              <span className="px-3 py-1 bg-[var(--accent-green)]/10 text-[var(--accent-green)] rounded-full text-xs font-bold tracking-wider uppercase border border-[var(--accent-green)]/20">
                {article.category || "General"}
              </span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-extrabold mb-6 leading-tight">
              {article.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400 font-medium">
              <span className="flex items-center gap-2">
                <Calendar size={14} className="text-[var(--accent-cyan)]" /> 
                {new Date(article.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
              <span className="flex items-center gap-2">
                <User size={14} className="text-[var(--accent-cyan)]" /> 
                {"Equipo Editorial"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <section className="container mx-auto px-4 max-w-4xl mt-12 w-full">
        {article.excerpt && (
          <p className="text-xl text-gray-300 font-medium leading-relaxed mb-12 border-l-4 border-[var(--accent-cyan)] pl-6">
            {article.excerpt}
          </p>
        )}
        
        <div 
          className="prose prose-invert prose-p:text-gray-300 prose-headings:text-white prose-a:text-[var(--accent-cyan)] prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-img:border prose-img:border-white/10 prose-video:rounded-xl prose-video:w-full prose-video:aspect-video max-w-none break-words"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      </section>
    </main>
  );
}
