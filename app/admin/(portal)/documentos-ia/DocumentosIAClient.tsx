"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Plus, Trash2, FileText, Save, X, Search, Bot, Upload, Loader2 } from "lucide-react";

type KnowledgeDoc = {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  updated_at: string;
};

export default function DocumentosIAClient({ initialDocs }: { initialDocs: KnowledgeDoc[] }) {
  const supabase = createClient();
  const [docs, setDocs] = useState<KnowledgeDoc[]>(initialDocs);
  const [searchQ, setSearchQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState<KnowledgeDoc | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string>("");
  const [uploadError, setUploadError] = useState<string>("");

  const categories = ["general", "productos", "servicios", "tecnología", "preguntas_frecuentes", "políticas", "soporte"];

  const normalizedCategory = (c: string) =>
    c
      .normalize("NFD")
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, "_")
      .toLowerCase();

  const resetForm = () => {
    setTitle("");
    setContent("");
    setCategory("general");
    setEditingDoc(null);
    setShowForm(false);
  };

  const openEdit = (doc: KnowledgeDoc) => {
    setEditingDoc(doc);
    setTitle(doc.title);
    setContent(doc.content);
    setCategory(doc.category || "general");
    setShowForm(true);
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadError("");
    setUploadMessage("");

    try {
      const fd = new FormData();
      fd.set("file", uploadFile);
      fd.set("category", normalizedCategory(category));

      const res = await fetch("/api/admin/knowledge/import", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo importar el documento");

      if (Array.isArray(data.docs) && data.docs.length > 0) {
        setDocs((prev) => [...data.docs, ...prev]);
      }

      const truncated = data.truncated ? " (se recorto por tamaño)" : "";
      setUploadMessage(`Importado correctamente: ${data.imported} documento(s), ${data.charsExtracted} caracteres${truncated}.`);
      setUploadFile(null);
      setShowForm(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Error al importar archivo");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);

    try {
      if (editingDoc) {
        const { error } = await supabase
          .from("knowledge_documents")
          .update({ title: title.trim(), content: content.trim(), category, updated_at: new Date().toISOString() })
          .eq("id", editingDoc.id);

        if (error) throw error;
        setDocs((prev) => prev.map((d) => d.id === editingDoc.id ? { ...d, title: title.trim(), content: content.trim(), category, updated_at: new Date().toISOString() } : d));
      } else {
        const { data, error } = await supabase
          .from("knowledge_documents")
          .insert({ title: title.trim(), content: content.trim(), category })
          .select()
          .single();

        if (error) throw error;
        if (data) setDocs((prev) => [data, ...prev]);
      }
      resetForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Eliminar este documento? La IA dejará de usar esta información.")) return;
    setDeleting(id);

    try {
      const { error } = await supabase.from("knowledge_documents").delete().eq("id", id);
      if (error) throw error;
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setDeleting(null);
    }
  };

  const filtered = docs.filter(
    (d) => !searchQ ||
      d.title.toLowerCase().includes(searchQ.toLowerCase()) ||
      d.category.toLowerCase().includes(searchQ.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Bot size={28} className="text-cyan-400" /> Documentos IA
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Base de conocimiento para el asistente virtual. La IA usará estos documentos para responder a los visitantes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/20 hover:bg-cyan-500/30 transition-colors text-sm font-semibold w-full sm:w-auto justify-center"
        >
          <Plus size={16} /> Nuevo documento
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              {editingDoc ? "Editar documento" : "Nuevo documento"}
            </h2>
            <button type="button" onClick={resetForm} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Título</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Información sobre EcoCooler V3"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-cyan-400/50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400/50"
              >
                {categories.map((c) => (
                  <option key={c} value={c} className="bg-gray-900">{c.replace("_", " ").replace(/^\w/, (l) => l.toUpperCase())}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Contenido</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escribe la información que la IA debe conocer. Cuanto más detallado, mejores serán las respuestas."
              rows={8}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-cyan-400/50 resize-y"
            />
            <p className="text-[10px] text-gray-600 mt-1">{content.length} caracteres</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Upload size={14} className="text-cyan-300" />
              <p className="text-xs font-semibold text-cyan-300">Importar archivo para entrenar la IA</p>
            </div>
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setUploadFile(file);
                setUploadError("");
                setUploadMessage("");
              }}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-500/20 file:px-3 file:py-1.5 file:text-cyan-300"
              accept=".txt,.md,.markdown,.log,.json,.csv,.xml,.html,.htm,.docx,.pdf,.xls,.xlsx"
            />
            <p className="text-[10px] text-gray-500">
              Formatos soportados: TXT, MD, JSON, CSV, XML, HTML, DOCX, PDF, XLS, XLSX. Tamaño máximo: 10MB.
            </p>
            <button
              type="button"
              onClick={handleUpload}
              disabled={!uploadFile || uploading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-400/20 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/25 disabled:opacity-40"
            >
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              {uploading ? "Procesando..." : "Importar archivo"}
            </button>
            {uploadMessage && <p className="text-[11px] text-emerald-300">{uploadMessage}</p>}
            {uploadError && <p className="text-[11px] text-red-300">{uploadError}</p>}
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={resetForm} className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!title.trim() || !content.trim() || saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/20 hover:bg-cyan-500/30 transition-colors text-sm font-semibold disabled:opacity-40"
            >
              <Save size={14} /> {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 mb-4">
        <Search size={16} className="text-gray-500 shrink-0" />
        <input
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder="Buscar documentos..."
          className="bg-transparent text-sm text-white placeholder-gray-600 outline-none w-full"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <FileText size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No hay documentos de conocimiento</p>
          <p className="text-xs mt-1">Crea documentos para que la IA pueda responder mejor a los visitantes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 hover:border-white/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText size={14} className="text-cyan-400 shrink-0" />
                    <h3 className="text-sm font-semibold text-white truncate">{doc.title}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-400 shrink-0">
                      {doc.category.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{doc.content}</p>
                  <p className="text-[10px] text-gray-600 mt-2">
                    {doc.content.length} caracteres · Actualizado {new Date(doc.updated_at).toLocaleDateString("es")}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(doc)}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Editar"
                  >
                    <FileText size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(doc.id)}
                    disabled={deleting === doc.id}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-cyan-400/10 bg-cyan-500/5 p-4">
        <h3 className="text-sm font-semibold text-cyan-300 flex items-center gap-2 mb-2">
          <Bot size={16} /> Consejos para la base de conocimiento
        </h3>
        <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
          <li>Incluye información detallada sobre productos, precios y disponibilidad</li>
          <li>Agrega preguntas frecuentes y sus respuestas</li>
          <li>Documenta políticas de servicio, envío y garantía</li>
          <li>Puedes importar documentos en varios formatos para construir una base de conocimiento más completa</li>
          <li>Cuanto más específico sea el contenido, mejores serán las respuestas de la IA</li>
          <li>Actualiza los documentos regularmente para mantener la información al día</li>
        </ul>
      </div>
    </div>
  );
}
