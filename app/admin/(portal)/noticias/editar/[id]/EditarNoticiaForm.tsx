"use client";

import { useState } from "react";
import { updateNoticia } from "../../actions";
import { Save, Loader2 } from "lucide-react";
import Link from "next/link";
import RichTextEditor from "@/components/RichTextEditor";
import Image from "next/image";

type Noticia = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  img_url: string;
};

export default function EditarNoticiaForm({ noticia }: { noticia: Noticia }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState(noticia.content || "");
  const [previewImage, setPreviewImage] = useState<string | null>(noticia.img_url);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await updateNoticia(noticia.id, formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewImage(url);
    }
  };

  return (
    <form action={handleSubmit} className="bg-black/40 border border-white/10 rounded-2xl p-8 backdrop-blur-md space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="title" className="text-sm font-medium text-gray-400">Título del Artículo *</label>
          <input 
            type="text" 
            id="title" 
            name="title" 
            defaultValue={noticia.title}
            required
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[var(--accent-cyan)] focus:outline-none transition-colors"
            placeholder="Ej: Nuevos avances en refrigeración sostenible..."
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="category" className="text-sm font-medium text-gray-400">Categoría</label>
          <input 
            type="text" 
            id="category" 
            name="category" 
            defaultValue={noticia.category}
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[var(--accent-cyan)] focus:outline-none transition-colors"
            placeholder="Ej: Tecnología, General, Sostenibilidad"
          />
        </div>

        <div className="space-y-4">
          <label htmlFor="image" className="text-sm font-medium text-gray-400">Imagen Principal (Opcional: Subir nueva para reemplazar)</label>
          <div className="flex items-center gap-4">
            {previewImage && (
              <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-white/10">
                <Image src={previewImage} alt="Preview" fill className="object-cover" />
              </div>
            )}
            <input 
              type="file" 
              id="image" 
              name="image" 
              accept="image/*"
              onChange={handleImageChange}
              className="w-full bg-black/50 border border-white/10 rounded-xl file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-[var(--accent-cyan)]/10 file:text-[var(--accent-cyan)] hover:file:bg-[var(--accent-cyan)]/20 text-gray-400 focus:outline-none transition-colors cursor-pointer"
            />
          </div>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="excerpt" className="text-sm font-medium text-gray-400">Resumen (Excerpt)</label>
          <textarea 
            id="excerpt" 
            name="excerpt" 
            defaultValue={noticia.excerpt}
            rows={2}
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[var(--accent-cyan)] focus:outline-none transition-colors resize-none"
            placeholder="Un breve resumen que aparecerá en la página principal de noticias."
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="content" className="text-sm font-medium text-gray-400">Contenido Completo *</label>
          <input type="hidden" name="content" value={content} />
          <RichTextEditor 
            value={content}
            onChange={setContent}
            placeholder="Escribe el contenido completo del artículo aquí..."
          />
        </div>

      </div>

      <div className="pt-6 border-t border-white/10 flex justify-end gap-4">
        <Link
          href="/admin/noticias"
          className="px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 font-medium transition-colors"
        >
          Cancelar
        </Link>
        <button 
          type="submit" 
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent-cyan)] text-black font-bold hover:bg-[var(--accent-cyan)]/90 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          Guardar Cambios
        </button>
      </div>
    </form>
  );
}
