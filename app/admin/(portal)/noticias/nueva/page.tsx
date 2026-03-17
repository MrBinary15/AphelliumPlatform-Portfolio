"use client";

import { useEffect, useRef, useState } from "react";
import { createNoticia } from "../actions";
import { ArrowLeft, Eye, Save, Loader2, X, Calendar, User } from "lucide-react";
import Link from "next/link";
import RichTextEditor from "@/components/RichTextEditor";

type DownloadFormat = "html" | "word" | "pdf";

const DRAFT_STORAGE_KEY = "aphellium:noticias:nueva:draft";

type DraftPayload = {
  title: string;
  category: string;
  excerpt: string;
  content: string;
  updatedAt: string;
};

export default function NuevaNoticiaPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>("html");
  const [draftMessage, setDraftMessage] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<"articulo" | "principal">("articulo");
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);

  useEffect(() => {
    return () => {
      if (coverPreviewUrl) {
        URL.revokeObjectURL(coverPreviewUrl);
      }
    };
  }, [coverPreviewUrl]);

  useEffect(() => {
    const rawDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!rawDraft) return;

    try {
      const parsed = JSON.parse(rawDraft) as DraftPayload;
      setTitle(parsed.title || "");
      setCategory(parsed.category || "");
      setExcerpt(parsed.excerpt || "");
      setContent(parsed.content || "");
      if (parsed.updatedAt) {
        setDraftMessage(`Borrador cargado (${new Date(parsed.updatedAt).toLocaleString("es-ES")}).`);
      }
    } catch {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }, []);

  const saveDraft = () => {
    const draft: DraftPayload = {
      title,
      category,
      excerpt,
      content,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    setDraftMessage(`Borrador guardado (${new Date(draft.updatedAt).toLocaleTimeString("es-ES")}).`);
  };

  const buildExportHtml = () => {
    const safeTitle = (title || "Noticia sin titulo").trim();
    const safeCategory = (category || "General").trim();
    const safeExcerpt = (excerpt || "").trim();
    const safeContent = content || "";

    return `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; max-width: 840px; margin: 40px auto; padding: 0 16px; color: #0f172a; line-height: 1.7; }
    h1 { font-size: 2rem; margin: 0 0 8px; }
    .meta { color: #475569; font-size: 0.95rem; margin-bottom: 24px; }
    .excerpt { border-left: 4px solid #0ea5e9; padding-left: 12px; color: #334155; margin-bottom: 24px; }
    img, iframe, video { max-width: 100%; border-radius: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    td, th { border: 1px solid #cbd5e1; padding: 8px; }
  </style>
</head>
<body>
  <h1>${safeTitle}</h1>
  <p class="meta"><strong>Categoria:</strong> ${safeCategory}</p>
  ${safeExcerpt ? `<p class="excerpt">${safeExcerpt}</p>` : ""}
  <article>${safeContent}</article>
</body>
</html>`;
  };

  const downloadFile = async () => {
    const html = buildExportHtml();
    const baseName = (title || "noticia").trim().toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "noticia";

    if (downloadFormat === "html") {
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${baseName}.html`;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    if (downloadFormat === "word") {
      const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${baseName}.doc`;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    const html2pdfModule = await import("html2pdf.js");
    const html2pdf = html2pdfModule.default;
    const exportContainer = document.createElement("div");
    exportContainer.innerHTML = html;

    await html2pdf()
      .from(exportContainer)
      .set({
        margin: 10,
        filename: `${baseName}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .save();
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (coverPreviewUrl) {
      URL.revokeObjectURL(coverPreviewUrl);
      setCoverPreviewUrl(null);
    }

    if (file) {
      setCoverImageFile(file);
      setCoverPreviewUrl(URL.createObjectURL(file));
    } else {
      setCoverImageFile(null);
    }
  };

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const currentTitle = (formData.get("title") as string) || "";
    const currentCategory = (formData.get("category") as string) || "";
    const currentExcerpt = (formData.get("excerpt") as string) || "";
    setTitle(currentTitle);
    setCategory(currentCategory);
    setExcerpt(currentExcerpt);

    if (coverImageFile) {
      formData.set("image", coverImageFile);
    }

    const result = await createNoticia(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      setDraftMessage(null);
    }
  }

  const handlePreviewPublish = () => {
    setPreviewOpen(false);
    formRef.current?.requestSubmit();
  };

  const previewLeadText = (() => {
    const trimmedExcerpt = excerpt.trim();
    if (trimmedExcerpt) return trimmedExcerpt;
    const plainContent = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!plainContent) return "Sin resumen disponible.";
    return plainContent.length > 180 ? `${plainContent.slice(0, 180)}...` : plainContent;
  })();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <Link 
          href="/admin/noticias" 
          className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Escribir Noticia</h1>
          <p className="text-gray-400 mt-1">Publica un nuevo artículo en el blog público.</p>
        </div>
      </div>

      <form ref={formRef} action={handleSubmit} className="bg-black/40 border border-white/10 rounded-2xl p-8 backdrop-blur-md space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
            <p>{error}</p>
            <p className="text-red-300/80 mt-2">Verifica que el titulo no este vacio y agrega contenido en el editor (puedes insertar embeds ahi).</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="title" className="text-sm font-medium text-gray-400">Título del Artículo *</label>
            <input 
              type="text" 
              id="title" 
              name="title" 
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[var(--accent-cyan)] focus:outline-none transition-colors"
              placeholder="Ej: Tecnología, General, Sostenibilidad"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="image" className="text-sm font-medium text-gray-400">Imagen Principal</label>
            <input 
              type="file" 
              id="image" 
              name="image" 
              accept="image/*"
              onChange={handleCoverImageChange}
              className="w-full bg-black/50 border border-white/10 rounded-xl file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-[var(--accent-cyan)]/10 file:text-[var(--accent-cyan)] hover:file:bg-[var(--accent-cyan)]/20 text-gray-400 focus:outline-none transition-colors cursor-pointer"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="excerpt" className="text-sm font-medium text-gray-400">Resumen (Excerpt)</label>
            <textarea 
              id="excerpt" 
              name="excerpt" 
              rows={2}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
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
              downloadFormat={downloadFormat}
              onDownloadFormatChange={setDownloadFormat}
              onDownload={downloadFile}
            />
          </div>
        </div>

        <div className="pt-6 border-t border-white/10">
          <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/admin/noticias"
            className="min-w-[170px] text-center px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 font-medium transition-colors"
          >
            Cancelar
          </Link>

          <button
            type="button"
            onClick={saveDraft}
            className="min-w-[170px] px-6 py-3 rounded-xl border border-white/20 text-gray-100 hover:bg-white/10 font-medium transition-colors"
          >
            Guardar borrador
          </button>

          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="min-w-[170px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/20 text-gray-100 hover:bg-white/10 font-medium transition-colors"
          >
            <Eye size={18} />
            Previsualizar
          </button>

          <button 
            type="submit" 
            disabled={loading}
            className="min-w-[190px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent-cyan)] text-black font-bold hover:bg-[var(--accent-cyan)]/90 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Publicar Artículo
          </button>
          </div>

          {draftMessage && <p className="mt-3 text-xs text-gray-400 text-center">{draftMessage}</p>}
        </div>
      </form>

      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 md:p-8 overflow-y-auto">
          <div className="max-w-5xl mx-auto bg-[var(--bg-dark)] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5 sticky top-0 z-10">
              <div>
                <h2 className="text-lg font-semibold text-white">Previsualizacion del articulo</h2>
                <p className="text-xs text-gray-400">Simulacion de como se veria al publicarse.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuickEditOpen((prev) => !prev)}
                  className="px-3 py-2 rounded-lg border border-white/20 hover:bg-white/10 text-sm text-gray-200"
                >
                  {quickEditOpen ? "Ver previa" : "Editar rapido"}
                </button>
                <button
                  type="button"
                  onClick={handlePreviewPublish}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--accent-cyan)] text-black text-sm font-bold hover:bg-[var(--accent-cyan)]/90 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  Publicar
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-white/20 hover:bg-white/10 text-sm text-gray-300"
                  aria-label="Cerrar previsualizacion"
                >
                  <X size={16} />
                  Salir
                </button>
              </div>
            </div>

            <div className="px-5 md:px-8 py-3 border-b border-white/10 bg-black/20 flex flex-wrap items-center gap-3">
              <span className="text-xs uppercase tracking-[0.16em] text-gray-400">Vista</span>
              <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => setPreviewMode("principal")}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${previewMode === "principal" ? "bg-[var(--accent-green)] text-black font-semibold" : "text-gray-300 hover:bg-white/10"}`}
                >
                  Noticia principal
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("articulo")}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${previewMode === "articulo" ? "bg-[var(--accent-cyan)] text-black font-semibold" : "text-gray-300 hover:bg-white/10"}`}
                >
                  Articulo completo
                </button>
              </div>
              <p className="text-xs text-gray-400">
                {previewMode === "articulo" ? "Modo lectura completa del articulo." : "Modo tarjeta/listado para portada de noticias."}
              </p>
            </div>

            {quickEditOpen && (
              <div className="px-5 md:px-8 py-5 border-b border-white/10 bg-white/[0.03] space-y-4">
                <h3 className="text-sm font-semibold text-white">
                  {previewMode === "articulo" ? "Edicion rapida del articulo" : "Edicion rapida de noticia principal"}
                </h3>
                <p className="text-xs text-[var(--accent-cyan)]" aria-live="polite">
                  Los cambios se reflejan al instante en la previsualizacion de abajo.
                </p>

                {previewMode === "articulo" ? (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-400">Contenido</label>
                    <RichTextEditor
                      value={content}
                      onChange={setContent}
                      placeholder="Haz ajustes rapidos antes de publicar..."
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-400">Titulo en portada</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-[var(--accent-green)] focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-400">Categoria en portada</label>
                      <input
                        type="text"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-[var(--accent-green)] focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-400">Resumen en portada</label>
                      <textarea
                        rows={2}
                        value={excerpt}
                        onChange={(e) => setExcerpt(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-[var(--accent-green)] focus:outline-none transition-colors resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-400">Imagen de fondo de la tarjeta</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverImageChange}
                        className="w-full bg-black/50 border border-white/10 rounded-xl file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-[var(--accent-green)]/15 file:text-[var(--accent-green)] hover:file:bg-[var(--accent-green)]/25 text-gray-400 focus:outline-none transition-colors cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {previewMode === "articulo" ? (
              <article className="w-full bg-[var(--bg-dark)]">
                <div className="relative w-full h-[40vh] md:h-[50vh] bg-gray-900 border-b border-white/5 overflow-hidden">
                  {coverPreviewUrl ? (
                    <img src={coverPreviewUrl} alt="Portada de noticia" className="w-full h-full object-cover opacity-60" />
                  ) : (
                    <div className="w-full h-full bg-slate-800" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-dark)] via-[var(--bg-dark)]/80 to-transparent" />

                  <div className="absolute bottom-0 w-full left-0 z-10">
                    <div className="px-6 md:px-10 pb-10 md:pb-12 max-w-4xl">
                      <span className="inline-flex px-3 py-1 bg-[var(--accent-green)]/10 text-[var(--accent-green)] rounded-full text-xs font-bold tracking-wider uppercase border border-[var(--accent-green)]/20 mb-4">
                        {(category || "General").trim() || "General"}
                      </span>

                      <h1 className="text-3xl md:text-5xl font-extrabold mb-6 leading-tight text-white">
                        {(title || "Titulo de la noticia").trim() || "Titulo de la noticia"}
                      </h1>

                      <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400 font-medium">
                        <span className="flex items-center gap-2">
                          <Calendar size={14} className="text-[var(--accent-cyan)]" />
                          {new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}
                        </span>
                        <span className="flex items-center gap-2">
                          <User size={14} className="text-[var(--accent-cyan)]" />
                          Equipo Editorial
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <section className="px-6 md:px-10 py-10 md:py-12 max-w-4xl">
                  {excerpt.trim() && (
                    <p className="text-xl text-gray-300 font-medium leading-relaxed mb-12 border-l-4 border-[var(--accent-cyan)] pl-6">
                      {excerpt.trim()}
                    </p>
                  )}

                  <div
                    className="prose prose-invert prose-p:text-gray-300 prose-headings:text-white prose-a:text-[var(--accent-cyan)] prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-img:border prose-img:border-white/10 prose-video:rounded-xl prose-video:w-full prose-video:aspect-video max-w-none break-words"
                    dangerouslySetInnerHTML={{ __html: content || "<p class='text-gray-500'>Aun no hay contenido para previsualizar.</p>" }}
                  />
                </section>
              </article>
            ) : (
              <section className="px-5 md:px-8 py-8">
                <div className="max-w-xl mx-auto rounded-2xl overflow-hidden border border-white/10 bg-black/30 shadow-xl">
                  <div className="h-48 bg-slate-800 overflow-hidden">
                    {coverPreviewUrl ? (
                      <img src={coverPreviewUrl} alt="Portada de noticia" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                        Sin imagen de portada
                      </div>
                    )}
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="px-2.5 py-1 rounded-full border border-[var(--accent-green)]/35 bg-[var(--accent-green)]/10 text-[var(--accent-green)] text-[11px] font-semibold uppercase tracking-wide">
                        {(category || "General").trim() || "General"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white leading-snug">
                      {(title || "Titulo de la noticia").trim() || "Titulo de la noticia"}
                    </h3>

                    <p className="text-sm text-gray-300 leading-relaxed">
                      {previewLeadText}
                    </p>

                    <div className="pt-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]/80"
                      >
                        Leer noticia
                        <span aria-hidden="true">→</span>
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
