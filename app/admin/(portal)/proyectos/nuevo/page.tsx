"use client";

import { useEffect, useRef, useState } from "react";
import { createProyecto } from "../actions";
import {
  ArrowLeft, Upload, Plus, X, Star, Loader2, Eye, Save,
  MapPin, Calendar, Building2, BarChart3, Tag, ChevronDown, ChevronUp,
} from "lucide-react";
import Link from "next/link";
import RichTextEditor from "@/components/RichTextEditor";

type DownloadFormat = "html" | "word" | "pdf";

const DRAFT_KEY = "aphellium:proyectos:nuevo:draft";

type DraftPayload = {
  title: string;
  category: string;
  status: string;
  excerpt: string;
  description: string;
  client_type: string;
  client_name: string;
  location: string;
  start_date: string;
  end_date: string;
  tags: string;
  metrics: { label: string; value: string }[];
  featured: boolean;
  updatedAt: string;
};

const CLIENT_TYPES = [
  { value: "propio", label: "Proyecto propio de la empresa", icon: "🏢" },
  { value: "un_cliente", label: "Para un cliente", icon: "👤" },
  { value: "varios_clientes", label: "Para varios clientes", icon: "👥" },
];

const CATEGORIES = [
  "Floricultura", "Agro Exportación", "Logística", "Energía",
  "Tecnología", "Infraestructura", "Consultoría", "Otro",
];

const STATUSES = [
  { value: "planning", label: "Planificación" },
  { value: "active", label: "Activo" },
  { value: "completed", label: "Completado" },
  { value: "paused", label: "Pausado" },
];

const STATUS_COLORS: Record<string, string> = {
  planning: "text-amber-300 bg-amber-500/15 border-amber-400/30",
  active: "text-emerald-300 bg-emerald-500/15 border-emerald-400/30",
  completed: "text-cyan-300 bg-cyan-500/15 border-cyan-400/30",
  paused: "text-gray-400 bg-gray-500/15 border-gray-400/30",
};

export default function NuevoProyectoPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("active");
  const [excerpt, setExcerpt] = useState("");
  const [description, setDescription] = useState("");
  const [clientType, setClientType] = useState("");
  const [clientName, setClientName] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [metrics, setMetrics] = useState<{ label: string; value: string }[]>([]);
  const [metricLabel, setMetricLabel] = useState("");
  const [metricValue, setMetricValue] = useState("");
  const [featured, setFeatured] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [draftMessage, setDraftMessage] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<"tarjeta" | "completo">("completo");
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>("html");
  const [detailsExpanded, setDetailsExpanded] = useState(true);

  /* ─── Cover image cleanup ─── */
  useEffect(() => {
    return () => { if (imagePreview) URL.revokeObjectURL(imagePreview); };
  }, [imagePreview]);

  /* ─── Draft restore ─── */
  useEffect(() => {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const d = JSON.parse(raw) as DraftPayload;
      setTitle(d.title || "");
      setCategory(d.category || "");
      setStatus(d.status || "active");
      setExcerpt(d.excerpt || "");
      setDescription(d.description || "");
      setClientType(d.client_type || "");
      setClientName(d.client_name || "");
      setLocation(d.location || "");
      setStartDate(d.start_date || "");
      setEndDate(d.end_date || "");
      setTagsInput(d.tags || "");
      setMetrics(d.metrics || []);
      setFeatured(d.featured || false);
      if (d.updatedAt) setDraftMessage(`Borrador cargado (${new Date(d.updatedAt).toLocaleString("es-ES")}).`);
    } catch { window.localStorage.removeItem(DRAFT_KEY); }
  }, []);

  /* ─── Draft save ─── */
  const saveDraft = () => {
    const draft: DraftPayload = {
      title, category, status, excerpt, description, client_type: clientType,
      client_name: clientName, location, start_date: startDate, end_date: endDate, tags: tagsInput,
      metrics, featured, updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    setDraftMessage(`Borrador guardado (${new Date().toLocaleTimeString("es-ES")}).`);
  };

  /* ─── Metrics ─── */
  function addMetric() {
    if (!metricLabel.trim() || !metricValue.trim()) return;
    setMetrics(prev => [...prev, { label: metricLabel.trim(), value: metricValue.trim() }]);
    setMetricLabel(""); setMetricValue("");
  }
  function removeMetric(i: number) { setMetrics(prev => prev.filter((_, idx) => idx !== i)); }

  /* ─── Cover image ─── */
  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (imagePreview) { URL.revokeObjectURL(imagePreview); setImagePreview(null); }
    if (file) { setCoverFile(file); setImagePreview(URL.createObjectURL(file)); } else { setCoverFile(null); }
  }

  /* ─── Export ─── */
  const buildExportHtml = () => {
    const safeTitle = (title || "Proyecto sin título").trim();
    return `<!doctype html>
<html lang="es"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${safeTitle}</title>
<style>body{font-family:Calibri,Arial,sans-serif;max-width:840px;margin:40px auto;padding:0 16px;color:#0f172a;line-height:1.7}
h1{font-size:2rem;margin:0 0 8px}.meta{color:#475569;font-size:.95rem;margin-bottom:24px}.excerpt{border-left:4px solid #0ea5e9;padding-left:12px;color:#334155;margin-bottom:24px}
img,iframe,video{max-width:100%;border-radius:10px}table{width:100%;border-collapse:collapse;margin:16px 0}td,th{border:1px solid #cbd5e1;padding:8px}
.metrics{display:flex;gap:24px;margin:16px 0;flex-wrap:wrap}.metric{text-align:center}.metric-value{font-size:1.5rem;font-weight:700}.metric-label{font-size:.85rem;color:#64748b}
</style></head><body>
<h1>${safeTitle}</h1>
<p class="meta">${[category, STATUSES.find(s => s.value === status)?.label, location, clientDisplay].filter(Boolean).join(" \u00b7 ")}</p>
${excerpt ? `<p class="excerpt">${excerpt}</p>` : ""}
${metrics.length > 0 ? `<div class="metrics">${metrics.map(m => `<div class="metric"><div class="metric-value">${m.value}</div><div class="metric-label">${m.label}</div></div>`).join("")}</div>` : ""}
<article>${description || ""}</article>
</body></html>`;
  };

  const downloadFile = async () => {
    const html = buildExportHtml();
    const baseName = (title || "proyecto").trim().toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "proyecto";
    if (downloadFormat === "html") {
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${baseName}.html`; a.click(); URL.revokeObjectURL(a.href); return;
    }
    if (downloadFormat === "word") {
      const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${baseName}.doc`; a.click(); URL.revokeObjectURL(a.href); return;
    }
    const html2pdfModule = await import("html2pdf.js");
    const html2pdf = html2pdfModule.default;
    const el = document.createElement("div"); el.innerHTML = html;
    await html2pdf().from(el).set({ margin: 10, filename: `${baseName}.pdf`, image: { type: "jpeg", quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: "mm", format: "a4", orientation: "portrait" } }).save();
  };

  /* ─── Submit ─── */
  async function handleSubmit(formData: FormData) {
    setSubmitting(true); setError("");
    formData.set("title", title);
    formData.set("category", category);
    formData.set("status", status);
    formData.set("excerpt", excerpt);
    formData.set("description", description);
    formData.set("client_type", clientType);
    formData.set("client_name", clientName);
    formData.set("location", location);
    formData.set("start_date", startDate);
    formData.set("end_date", endDate);
    formData.set("tags", tagsInput);
    formData.set("metrics", JSON.stringify(metrics));
    formData.set("featured", featured ? "true" : "false");
    if (coverFile) formData.set("image", coverFile);
    const result = await createProyecto(formData);
    if (result?.error) { setError(result.error); setSubmitting(false); }
    else { window.localStorage.removeItem(DRAFT_KEY); setDraftMessage(null); }
  }

  const handlePreviewPublish = () => { setPreviewOpen(false); formRef.current?.requestSubmit(); };

  const statusLabel = STATUSES.find(s => s.value === status)?.label || status;
  const previewExcerpt = excerpt.trim() || description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 180) || "Sin resumen disponible.";
  const parsedTags = tagsInput ? tagsInput.split(",").map(t => t.trim()).filter(Boolean) : [];
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("es-EC", { month: "short", year: "numeric" }) : "—";

  const clientDisplay = clientType === "propio" ? "Proyecto propio" : clientName;

  const inputCls = "w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[var(--accent-cyan)] transition-colors";
  const labelCls = "block text-sm font-medium text-gray-300 mb-1.5";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/proyectos" className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Nuevo Proyecto</h1>
          <p className="text-gray-400 mt-1">Agrega un nuevo proyecto al portafolio de Aphellium.</p>
        </div>
      </div>

      <form ref={formRef} action={handleSubmit} className="space-y-8">
        {error && (
          <div className="bg-red-500/10 border border-red-400/30 rounded-xl p-4 text-red-300 text-sm">{error}</div>
        )}

        {/* Basic Info */}
        <section className="bg-black/40 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-md space-y-5">
          <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-3">Información General</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className={labelCls}>Título del Proyecto <span className="text-[var(--accent-cyan)]">*</span></label>
              <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Ej: Exportación ECU-MIA Cero Emisiones" className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Categoría</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
                <option value="">Seleccionar categoría</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className={labelCls}>Estado</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className={labelCls}>Tipo de Cliente</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {CLIENT_TYPES.map((ct) => (
                  <button
                    key={ct.value}
                    type="button"
                    onClick={() => { setClientType(ct.value); if (ct.value === "propio") setClientName(""); }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                      clientType === ct.value
                        ? "bg-[var(--accent-cyan)]/10 border-[var(--accent-cyan)]/40 text-white"
                        : "bg-black/30 border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300"
                    }`}
                  >
                    <span className="text-xl">{ct.icon}</span>
                    <span className="text-sm font-medium">{ct.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {clientType && clientType !== "propio" && (
              <div className="md:col-span-2">
                <label className={labelCls}>
                  {clientType === "un_cliente" ? "Nombre del Cliente" : "Nombres de los Clientes"}
                </label>
                <input
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder={clientType === "un_cliente" ? "Ej: Empresa ABC S.A." : "Ej: Empresa ABC, Corporación XYZ, Grupo 123"}
                  className={inputCls}
                />
                {clientType === "varios_clientes" && (
                  <p className="text-xs text-gray-600 mt-1">Separa los nombres con comas.</p>
                )}
              </div>
            )}

            <div>
              <label className={labelCls}>Ubicación</label>
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Ej: Quito, Ecuador" className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Fecha de Inicio</label>
              <input value={startDate} onChange={e => setStartDate(e.target.value)} type="date" className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Fecha de Fin</label>
              <input value={endDate} onChange={e => setEndDate(e.target.value)} type="date" className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Resumen Corto</label>
            <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={2} placeholder="Breve descripción para la tarjeta de preview (1-2 líneas)" className={inputCls + " resize-none"} />
          </div>

          <div>
            <label className={labelCls}>Etiquetas</label>
            <input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="cadena de frío, exportación, sostenibilidad (separadas por coma)" className={inputCls} />
          </div>
        </section>

        {/* Rich Description */}
        <section className="bg-black/40 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-md space-y-4">
          <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-3">Descripción Completa *</h2>
          <p className="text-sm text-gray-500">Usa el editor para describir el proyecto con formato rico: imágenes, tablas, gráficos, embeds de video, etc.</p>
          <input type="hidden" name="description" value={description} />
          <RichTextEditor
            value={description}
            onChange={setDescription}
            placeholder="Describe el proyecto en detalle: contexto, solución implementada, tecnologías, impacto..."
            downloadFormat={downloadFormat}
            onDownloadFormatChange={setDownloadFormat}
            onDownload={downloadFile}
          />
        </section>

        {/* Cover Image */}
        <section className="bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4">
          <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-3">Imagen de Portada</h2>
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {imagePreview ? (
              <div className="relative w-full sm:w-48 h-32 rounded-xl overflow-hidden border border-white/10">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button type="button" onClick={() => { setImagePreview(null); setCoverFile(null); }} className="absolute top-1 right-1 p-1 bg-black/70 rounded-full hover:bg-red-500/50 transition-colors"><X size={14} /></button>
              </div>
            ) : (
              <label className="w-full sm:w-48 h-32 rounded-xl border-2 border-dashed border-white/10 hover:border-[var(--accent-cyan)]/40 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                <Upload size={24} className="text-gray-500 group-hover:text-[var(--accent-cyan)] transition-colors" />
                <span className="text-xs text-gray-500 mt-2 group-hover:text-gray-400">Subir imagen</span>
                <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
              </label>
            )}
            <div className="text-sm text-gray-500 mt-2 sm:mt-0">
              <p>Recomendado: 1200×675px o superior</p>
              <p>Formatos: JPG, PNG, WebP</p>
            </div>
          </div>
        </section>

        {/* Key Metrics */}
        <section className="bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4">
          <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-3">Métricas Clave</h2>
          <p className="text-sm text-gray-500">Agrega estadísticas impactantes del proyecto (ej: &quot;0% mermas térmicas&quot;, &quot;14h autonomía pasiva&quot;).</p>
          {metrics.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {metrics.map((m, i) => (
                <div key={i} className="flex items-center gap-2 bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/20 rounded-xl px-3 py-2">
                  <span className="text-white font-bold text-sm">{m.value}</span>
                  <span className="text-gray-400 text-xs">{m.label}</span>
                  <button type="button" onClick={() => removeMetric(i)} className="text-gray-500 hover:text-red-400"><X size={14} /></button>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <input value={metricValue} onChange={e => setMetricValue(e.target.value)} placeholder="Valor (ej: 0%, 14h)" className={inputCls + " sm:w-40"} />
            <input value={metricLabel} onChange={e => setMetricLabel(e.target.value)} placeholder="Etiqueta (ej: Mermas Térmicas)" className={inputCls + " flex-1"} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addMetric(); } }} />
            <button type="button" onClick={addMetric} className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-sm font-medium flex items-center gap-2 shrink-0"><Plus size={16} /> Agregar</button>
          </div>
        </section>

        {/* Featured */}
        <section className="bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
          <label className="flex items-center gap-3 cursor-pointer">
            <button type="button" onClick={() => setFeatured(!featured)} className={`w-10 h-6 rounded-full transition-colors relative ${featured ? "bg-[var(--accent-cyan)]" : "bg-white/10"}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${featured ? "translate-x-[18px]" : "translate-x-0.5"}`} />
            </button>
            <div>
              <span className="text-white font-medium flex items-center gap-2">
                <Star size={16} className={featured ? "text-amber-400 fill-amber-400" : "text-gray-500"} /> Proyecto Destacado
              </span>
              <span className="text-xs text-gray-500 block">Se mostrará de forma prominente en la página de proyectos</span>
            </div>
          </label>
        </section>

        {/* Actions */}
        <div className="pt-4 border-t border-white/10">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/admin/proyectos" className="min-w-[160px] text-center px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 font-medium transition-colors">Cancelar</Link>
            <button type="button" onClick={saveDraft} className="min-w-[160px] px-6 py-3 rounded-xl border border-white/20 text-gray-100 hover:bg-white/10 font-medium transition-colors">Guardar borrador</button>
            <button type="button" onClick={() => setPreviewOpen(true)} className="min-w-[160px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/20 text-gray-100 hover:bg-white/10 font-medium transition-colors"><Eye size={18} /> Previsualizar</button>
            <button type="submit" disabled={submitting} className="min-w-[180px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent-cyan)] text-black font-bold hover:bg-[var(--accent-cyan)]/90 transition-colors disabled:opacity-50">
              {submitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Publicar Proyecto
            </button>
          </div>
          {draftMessage && <p className="mt-3 text-xs text-gray-400 text-center">{draftMessage}</p>}
        </div>
      </form>

      {/* ═══ Preview Modal ═══ */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 md:p-8 overflow-y-auto">
          <div className="max-w-5xl mx-auto bg-[var(--bg-dark)] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5 sticky top-0 z-10">
              <div>
                <h2 className="text-lg font-semibold text-white">Previsualización del proyecto</h2>
                <p className="text-xs text-gray-400">Simulación de cómo se verá al publicarse.</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setQuickEditOpen(p => !p)} className="px-3 py-2 rounded-lg border border-white/20 hover:bg-white/10 text-sm text-gray-200">
                  {quickEditOpen ? "Ver previa" : "Editar rápido"}
                </button>
                <button type="button" onClick={handlePreviewPublish} disabled={submitting} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--accent-cyan)] text-black text-sm font-bold hover:bg-[var(--accent-cyan)]/90 disabled:opacity-60">
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Publicar
                </button>
                <button type="button" onClick={() => setPreviewOpen(false)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-white/20 hover:bg-white/10 text-sm text-gray-300"><X size={16} /> Salir</button>
              </div>
            </div>

            {/* View toggle */}
            <div className="px-5 md:px-8 py-3 border-b border-white/10 bg-black/20 flex flex-wrap items-center gap-3">
              <span className="text-xs uppercase tracking-[0.16em] text-gray-400">Vista</span>
              <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
                <button type="button" onClick={() => setPreviewMode("tarjeta")} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${previewMode === "tarjeta" ? "bg-[var(--accent-green)] text-black font-semibold" : "text-gray-300 hover:bg-white/10"}`}>Tarjeta</button>
                <button type="button" onClick={() => setPreviewMode("completo")} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${previewMode === "completo" ? "bg-[var(--accent-cyan)] text-black font-semibold" : "text-gray-300 hover:bg-white/10"}`}>Proyecto completo</button>
              </div>
              <p className="text-xs text-gray-400">{previewMode === "completo" ? "Vista completa del proyecto expandido." : "Vista de tarjeta en la página de proyectos."}</p>
            </div>

            {/* Quick Edit */}
            {quickEditOpen && (
              <div className="px-5 md:px-8 py-5 border-b border-white/10 bg-white/[0.03] space-y-4">
                <h3 className="text-sm font-semibold text-white">Edición rápida</h3>
                <p className="text-xs text-[var(--accent-cyan)]">Los cambios se reflejan al instante en la previsualización.</p>
                {previewMode === "completo" ? (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-400">Descripción</label>
                    <RichTextEditor value={description} onChange={setDescription} placeholder="Ajusta la descripción..." />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-400">Título</label>
                      <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-400">Resumen</label>
                      <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={2} className={inputCls + " resize-none"} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-400">Imagen de portada</label>
                      <input type="file" accept="image/*" onChange={handleCoverChange}
                        className="w-full bg-black/50 border border-white/10 rounded-xl file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-[var(--accent-green)]/15 file:text-[var(--accent-green)] hover:file:bg-[var(--accent-green)]/25 text-gray-400 focus:outline-none transition-colors cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── Preview: Complete Project ─── */}
            {previewMode === "completo" ? (
              <div className="w-full bg-[var(--bg-dark)]">
                {/* Hero */}
                <div className="relative w-full h-[40vh] md:h-[50vh] bg-gray-900 border-b border-white/5 overflow-hidden">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Portada" className="w-full h-full object-cover opacity-60" />
                  ) : (
                    <div className="w-full h-full bg-slate-800" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-dark)] via-[var(--bg-dark)]/80 to-transparent" />
                  <div className="absolute bottom-0 w-full z-10">
                    <div className="px-6 md:px-10 pb-10 md:pb-12 max-w-4xl">
                      <div className="flex flex-wrap gap-2 mb-4">
                        {category && <span className="px-3 py-1 bg-[var(--accent-green)]/10 text-[var(--accent-green)] rounded-full text-xs font-bold tracking-wider uppercase border border-[var(--accent-green)]/20">{category}</span>}
                        <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider border ${STATUS_COLORS[status] || ""}`}>{statusLabel}</span>
                      </div>
                      <h1 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight text-white">{title || "Título del proyecto"}</h1>
                      <div className="flex flex-wrap items-center gap-5 text-sm text-gray-400">
                        {location && <span className="flex items-center gap-2"><MapPin size={14} className="text-[var(--accent-cyan)]" /> {location}</span>}
                        {clientDisplay && <span className="flex items-center gap-2"><Building2 size={14} className="text-[var(--accent-cyan)]" /> {clientDisplay}</span>}
                        {(startDate || endDate) && <span className="flex items-center gap-2"><Calendar size={14} className="text-[var(--accent-cyan)]" /> {fmtDate(startDate)} – {fmtDate(endDate)}</span>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-6 md:px-10 py-10 md:py-12 max-w-4xl space-y-10">
                  {excerpt.trim() && <p className="text-xl text-gray-300 font-medium leading-relaxed border-l-4 border-[var(--accent-cyan)] pl-6">{excerpt.trim()}</p>}

                  {/* Metrics */}
                  {metrics.length > 0 && (
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-4"><BarChart3 size={16} className="text-[var(--accent-green)]" /> Resultados Clave</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {metrics.map((m, i) => (
                          <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/5 text-center">
                            <span className="block text-xl font-bold text-white">{m.value}</span>
                            <span className="text-xs text-gray-500">{m.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Content */}
                  <div className="prose prose-invert prose-p:text-gray-300 prose-headings:text-white prose-a:text-[var(--accent-cyan)] prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-img:border prose-img:border-white/10 max-w-none break-words"
                    dangerouslySetInnerHTML={{ __html: description || "<p class='text-gray-500'>Aún no hay contenido.</p>" }}
                  />

                  {/* Tags */}
                  {parsedTags.length > 0 && (
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-3"><Tag size={14} className="text-[var(--accent-cyan)]" /> Tecnologías</h3>
                      <div className="flex flex-wrap gap-2">{parsedTags.map(tag => <span key={tag} className="px-2.5 py-1 rounded-lg bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] text-xs border border-[var(--accent-cyan)]/20">{tag}</span>)}</div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ─── Preview: Card ─── */
              <section className="px-5 md:px-8 py-8">
                <div className="max-w-xl mx-auto rounded-2xl overflow-hidden border border-white/10 bg-black/30 shadow-xl">
                  <div className="relative h-48 bg-gray-900 overflow-hidden">
                    {imagePreview ? <img src={imagePreview} alt="Portada" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">Sin imagen de portada</div>}
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-dark)] to-transparent" />
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-20">
                      {category && <span className="px-2.5 py-0.5 bg-black/50 backdrop-blur-md rounded-full text-[10px] font-bold tracking-wider text-[var(--accent-green)] border border-white/10 uppercase">{category}</span>}
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider border backdrop-blur-md ${STATUS_COLORS[status] || ""}`}>{statusLabel}</span>
                    </div>
                    {featured && <div className="absolute top-3 right-3 z-20"><Star size={16} className="text-amber-400 fill-amber-400" /></div>}
                  </div>
                  <div className="p-5 space-y-3">
                    <h3 className="text-lg font-bold text-white leading-snug">{title || "Título del proyecto"}</h3>
                    <p className="text-sm text-gray-300 leading-relaxed line-clamp-3">{previewExcerpt}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
                      {location && <span className="flex items-center gap-1"><MapPin size={12} /> {location}</span>}
                      {clientDisplay && <span className="flex items-center gap-1"><Building2 size={12} /> {clientDisplay}</span>}
                    </div>
                    {metrics.length > 0 && (
                      <div className="flex gap-3 border-t border-white/10 pt-3">
                        {metrics.slice(0, 3).map((m, i) => (
                          <div key={i}><span className="block text-base font-bold text-white">{m.value}</span><span className="text-[10px] text-gray-500">{m.label}</span></div>
                        ))}
                      </div>
                    )}
                    <button type="button" onClick={() => setDetailsExpanded(!detailsExpanded)} className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent-cyan)] hover:underline">
                      Ver Detalles {detailsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                  {detailsExpanded && (
                    <div className="border-t border-white/10 bg-black/20 p-5 space-y-4">
                      {description && <div className="prose prose-invert prose-sm max-w-none break-words" dangerouslySetInnerHTML={{ __html: description }} />}
                      {parsedTags.length > 0 && <div className="flex flex-wrap gap-1.5">{parsedTags.map(tag => <span key={tag} className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] text-gray-400 border border-white/5">{tag}</span>)}</div>}
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
