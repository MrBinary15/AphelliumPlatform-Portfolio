import { createClient } from "@/utils/supabase/server";
import { Plus, Edit, Activity, CheckCircle2, AlertTriangle, Link2 } from "lucide-react";
import Link from "next/link";
import DeleteNoticiaButton from "@/components/DeleteNoticiaButton";
import { getAuthUser } from "@/utils/auth";
import { hasPermission } from "@/utils/roles";

type Noticia = {
  id: string;
  title: string;
  title_es?: string;
  title_en?: string;
  excerpt_es?: string;
  excerpt_en?: string;
  content_es?: string;
  content_en?: string;
  category_es?: string;
  category_en?: string;
  link?: string;
  source_url?: string;
  external_url?: string;
  url_publicacion?: string;
  category: string;
  created_at: string;
};

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function detectLinkType(value: string): "linkedin" | "facebook" | "instagram" | "x" | "web" {
  const normalized = value.toLowerCase();
  if (normalized.includes("linkedin.com")) return "linkedin";
  if (normalized.includes("facebook.com") || normalized.includes("fb.watch")) return "facebook";
  if (normalized.includes("instagram.com")) return "instagram";
  if (normalized.includes("x.com") || normalized.includes("twitter.com")) return "x";
  return "web";
}

function resolveNoticiaLink(item: Noticia): string {
  const candidates = [item.link, item.source_url, item.external_url, item.url_publicacion];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
}

export default async function AdminNoticiasPage(props: { searchParams?: Promise<{ diagnostics?: string; filter?: string }> }) {
  const auth = await getAuthUser();
  const canCreate = auth ? hasPermission(auth.role, "create_noticia") : false;
  const canEdit = auth ? hasPermission(auth.role, "edit_noticia") : false;
  const canDelete = auth ? hasPermission(auth.role, "delete_noticia") : false;

  const searchParams = await props.searchParams;
  const diagnosticsEnabled = searchParams?.diagnostics === "1";
  const requestedFilter = searchParams?.filter ?? "all";
  const selectedFilter = ["all", "needs-review", "bilingual-missing", "invalid-link"].includes(requestedFilter)
    ? requestedFilter
    : "all";
  const supabase = await createClient();
  
  const { data: noticias } = await supabase
    .from("noticias")
    .select("*")
    .order("created_at", { ascending: false });

  const diagnostics = (noticias || []).map((item: Noticia) => {
    const bilingualComplete =
      hasText(item.title_es) &&
      hasText(item.title_en) &&
      hasText(item.excerpt_es) &&
      hasText(item.excerpt_en) &&
      hasText(item.content_es) &&
      hasText(item.content_en);

    const linkValue = resolveNoticiaLink(item);
    const hasLink = hasText(linkValue);
    const linkValid = hasLink ? isValidUrl(linkValue) : false;
    const linkType = linkValid ? detectLinkType(linkValue) : "web";

    return {
      id: item.id,
      bilingualComplete,
      hasLink,
      linkValid,
      linkType,
    };
  });

  const total = diagnostics.length;
  const bilingualOk = diagnostics.filter((d) => d.bilingualComplete).length;
  const linkOk = diagnostics.filter((d) => d.hasLink && d.linkValid).length;
  const needsAttention = diagnostics.filter((d) => !d.bilingualComplete || (d.hasLink && !d.linkValid)).length;
  const diagnosticsById = new Map(diagnostics.map((item) => [item.id, item]));
  const filteredRows = (noticias || []).filter((item: Noticia) => {
    const row = diagnosticsById.get(item.id);
    if (!row) return false;

    if (selectedFilter === "needs-review") {
      return !row.bilingualComplete || (row.hasLink && !row.linkValid);
    }

    if (selectedFilter === "bilingual-missing") {
      return !row.bilingualComplete;
    }

    if (selectedFilter === "invalid-link") {
      return row.hasLink && !row.linkValid;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Gestión de Noticias</h1>
          <p className="text-gray-400 mt-2">Administra el contenido del blog y novedades.</p>
        </div>
        {canCreate && (
          <Link 
            href="/admin/noticias/nueva"
            className="flex items-center gap-2 bg-[var(--accent-cyan)] text-black font-bold px-4 py-2 rounded-xl hover:bg-[var(--accent-cyan)]/90 transition-colors"
          >
            <Plus size={20} />
            Nueva Noticia
          </Link>
        )}
      </div>

      <div className="bg-black/40 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Activity size={18} className="text-[var(--accent-cyan)]" />
              Diagnostico de Publicaciones
            </h2>
            <p className="text-sm text-gray-400 mt-1">Verifica traducciones ES/EN y estado de enlace para embed social.</p>
          </div>

          {diagnosticsEnabled ? (
            <Link
              href="/admin/noticias"
              className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-sm font-medium transition-colors"
            >
              Ocultar Diagnostico
            </Link>
          ) : (
            <Link
              href="/admin/noticias?diagnostics=1"
              className="px-4 py-2 rounded-xl border border-[var(--accent-cyan)]/40 text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/10 text-sm font-medium transition-colors"
            >
              Ejecutar Diagnostico
            </Link>
          )}
        </div>

        {diagnosticsEnabled && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-5">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-gray-400">Total Noticias</p>
                <p className="text-2xl font-bold mt-1">{total}</p>
              </div>
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3">
                <p className="text-xs text-emerald-300">Bilingue Completo</p>
                <p className="text-2xl font-bold mt-1 text-emerald-200">{bilingualOk}</p>
              </div>
              <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3">
                <p className="text-xs text-cyan-300">Link Valido</p>
                <p className="text-2xl font-bold mt-1 text-cyan-200">{linkOk}</p>
              </div>
              <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3">
                <p className="text-xs text-amber-300">Requiere Revision</p>
                <p className="text-2xl font-bold mt-1 text-amber-200">{needsAttention}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/admin/noticias?diagnostics=1&filter=all"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  selectedFilter === "all"
                    ? "border-[var(--accent-cyan)]/50 bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)]"
                    : "border-white/10 text-gray-300 hover:bg-white/5"
                }`}
              >
                Todas
              </Link>
              <Link
                href="/admin/noticias?diagnostics=1&filter=needs-review"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  selectedFilter === "needs-review"
                    ? "border-amber-400/40 bg-amber-500/10 text-amber-300"
                    : "border-white/10 text-gray-300 hover:bg-white/5"
                }`}
              >
                Requieren Revision
              </Link>
              <Link
                href="/admin/noticias?diagnostics=1&filter=bilingual-missing"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  selectedFilter === "bilingual-missing"
                    ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                    : "border-white/10 text-gray-300 hover:bg-white/5"
                }`}
              >
                Traduccion Incompleta
              </Link>
              <Link
                href="/admin/noticias?diagnostics=1&filter=invalid-link"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  selectedFilter === "invalid-link"
                    ? "border-rose-400/40 bg-rose-500/10 text-rose-300"
                    : "border-white/10 text-gray-300 hover:bg-white/5"
                }`}
              >
                Link Invalido
              </Link>
            </div>

            <div className="mt-5 overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-gray-300">
                  <tr>
                    <th className="px-4 py-3">Noticia</th>
                    <th className="px-4 py-3">Traduccion</th>
                    <th className="px-4 py-3">Link / Embed</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr className="border-t border-white/5">
                      <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                        No hay resultados para este filtro.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((item: Noticia) => {
                    const row = diagnosticsById.get(item.id);
                    return (
                      <tr key={`diag-${item.id}`} className="border-t border-white/5">
                        <td className="px-4 py-3 text-gray-200">{item.title}</td>
                        <td className="px-4 py-3">
                          {row?.bilingualComplete ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
                              <CheckCircle2 size={13} /> OK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 bg-amber-500/15 text-amber-300 border border-amber-400/30">
                              <AlertTriangle size={13} /> Incompleto
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {row?.hasLink ? (
                            row.linkValid ? (
                              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 bg-cyan-500/15 text-cyan-300 border border-cyan-400/30">
                                <Link2 size={13} /> {row.linkType.toUpperCase()}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 bg-rose-500/15 text-rose-300 border border-rose-400/30">
                                <AlertTriangle size={13} /> Link invalido
                              </span>
                            )
                          ) : (
                            <span className="text-gray-500">Sin enlace</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      
      <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="p-4 font-medium text-gray-400">Título</th>
              <th className="p-4 font-medium text-gray-400">Categoría</th>
              <th className="p-4 font-medium text-gray-400">Fecha</th>
              <th className="p-4 font-medium text-gray-400 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {!noticias || noticias.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  No hay noticias publicadas.
                </td>
              </tr>
            ) : (
              noticias.map((item: Noticia) => (
                <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4 font-medium">{item.title}</td>
                  <td className="p-4">
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs">
                      {item.category || "General"}
                    </span>
                  </td>
                  <td className="p-4 text-gray-400 text-sm">
                    {new Date(item.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2 text-gray-400">
                      {canEdit && (
                        <Link href={`/admin/noticias/editar/${item.id}`} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors" title="Editar">
                          <Edit size={16} />
                        </Link>
                      )}
                      {canDelete && (
                        <DeleteNoticiaButton id={item.id} title={item.title} />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
