"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { bilingualFromSource } from "@/utils/autoTranslate";
import { createAdminClient } from "@/utils/supabase/admin";

export async function publishNoticia(formData: FormData) {
  // --- RBAC: require create_noticia permission ---
  const { requirePermission } = await import("@/utils/auth");
  const permResult = await requirePermission("create_noticia");
  if ("error" in permResult) return { error: permResult.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado." };

  const title = formData.get("title") as string;
  const excerpt = formData.get("excerpt") as string;
  const content = formData.get("content") as string;
  const category = formData.get("category") as string;
  const imgFile = formData.get("image") as File | null;

  if (!title || !content) return { error: "Título y contenido obligatorios." };

  let finalImgUrl = null;

  const bilingualTitle = await bilingualFromSource(title);
  const bilingualExcerpt = await bilingualFromSource(excerpt || "");
  const bilingualContent = await bilingualFromSource(content);
  const bilingualCategory = await bilingualFromSource(category || "");

  if (imgFile && imgFile.size > 0) {
    const fileExt = imgFile.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('noticias')
      .upload(`public/${fileName}`, imgFile);

    if (uploadError) return { error: "Error al subir la imagen." };

    const { data: { publicUrl } } = supabase.storage
      .from('noticias')
      .getPublicUrl(`public/${fileName}`);
      
    finalImgUrl = publicUrl;
  }

  const payloadWithLocalized = {
    title,
    excerpt,
    content,
    category,
    title_es: bilingualTitle.es,
    title_en: bilingualTitle.en,
    excerpt_es: bilingualExcerpt.es,
    excerpt_en: bilingualExcerpt.en,
    content_es: bilingualContent.es,
    content_en: bilingualContent.en,
    category_es: bilingualCategory.es,
    category_en: bilingualCategory.en,
    img_url: finalImgUrl,
    author_id: user.id,
  };

  let { error } = await supabase.from("noticias").insert(payloadWithLocalized);

  if (error) {
    const { error: fallbackError } = await supabase.from("noticias").insert({
      title,
      excerpt,
      content,
      category,
      img_url: finalImgUrl,
      author_id: user.id,
    });
    error = fallbackError;
  }

  if (error) return { error: "Error al publicar la noticia." };

  revalidatePath("/noticias");
  revalidatePath("/admin/noticias");
  return { success: true };
}

export async function publishProyecto(formData: FormData) {
  // --- RBAC: require create_proyecto permission ---
  const { requirePermission } = await import("@/utils/auth");
  const permResult = await requirePermission("create_proyecto");
  if ("error" in permResult) return { error: permResult.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado." };

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const excerpt = formData.get("excerpt") as string;
  const category = formData.get("category") as string;
  const img_url = formData.get("img_url") as string;

  if (!title) return { error: "El título es obligatorio." };

  const bilingualTitle = await bilingualFromSource(title);
  const bilingualDescription = await bilingualFromSource(description || "");
  const bilingualExcerpt = await bilingualFromSource(excerpt || "");
  const bilingualCategory = await bilingualFromSource(category || "");

  const payloadWithLocalized = {
    title,
    description,
    excerpt,
    category,
    title_es: bilingualTitle.es,
    title_en: bilingualTitle.en,
    description_es: bilingualDescription.es,
    description_en: bilingualDescription.en,
    excerpt_es: bilingualExcerpt.es,
    excerpt_en: bilingualExcerpt.en,
    category_es: bilingualCategory.es,
    category_en: bilingualCategory.en,
    img_url,
    author_id: user.id,
  };

  let { error } = await supabase.from("proyectos").insert(payloadWithLocalized);

  if (error) {
    const { error: fallbackError } = await supabase.from("proyectos").insert({
      title,
      description,
      excerpt,
      category,
      img_url,
      author_id: user.id,
    });
    error = fallbackError;
  }

  if (error) return { error: "Error al publicar el proyecto. ¿Existe la tabla 'proyectos' en Supabase?" };

  revalidatePath("/proyectos");
  return { success: true };
}

export async function saveInlineEdits(pathname: string, edits: Array<{ key: string; text: string }>) {
  const { requireAdmin } = await import("@/utils/auth");
  const permResult = await requireAdmin();
  if ("error" in permResult) return { error: permResult.error };

  if (!pathname || !pathname.startsWith("/")) {
    return { error: "Ruta invalida para guardar cambios." };
  }

  if (!Array.isArray(edits) || edits.length === 0) {
    return { error: "No hay cambios para guardar." };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const normalizedPath = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  const profileUpdates = new Map<string, { full_name?: string | null; job_title?: string | null; description?: string | null }>();

  for (const edit of edits) {
    if (!edit?.key || typeof edit.text !== "string") continue;

    if (edit.key.startsWith("profile:")) {
      const parts = edit.key.split(":");
      const profileId = parts[1] || "";
      const field = parts[2] || "";
      if (!profileId) continue;

      if (field === "full_name" || field === "job_title" || field === "description") {
        const current = profileUpdates.get(profileId) || {};
        const value = edit.text.trim();
        if (field === "full_name") current.full_name = value || null;
        if (field === "job_title") current.job_title = value || null;
        if (field === "description") current.description = value || null;
        profileUpdates.set(profileId, current);
      }
      continue;
    }

    const normalizedKey = edit.key.startsWith(`${normalizedPath}:`)
      ? edit.key.slice(normalizedPath.length + 1)
      : edit.key;
    const settingKey = `inline_edit:${normalizedPath}:${normalizedKey}`;
    const { error } = await admin
      .from("site_settings")
      .upsert({ key: settingKey, value: edit.text, updated_at: now }, { onConflict: "key" });
    if (error) {
      console.error("saveInlineEdits upsert error", { settingKey, error });
      return { error: "No se pudieron guardar los cambios de texto." };
    }
  }

  for (const [profileId, updates] of profileUpdates.entries()) {
    const { error } = await admin
      .from("profiles")
      .update(updates)
      .eq("id", profileId);

    if (error) {
      console.error("saveInlineEdits profile update error", { profileId, updates, error });
      return { error: "No se pudieron guardar los cambios del perfil." };
    }
  }

  revalidatePath(normalizedPath);
  if (profileUpdates.size > 0) {
    revalidatePath("/");
    revalidatePath("/nosotros");
    revalidatePath("/admin/perfil");
    revalidatePath("/admin/usuarios");
  }
  return { success: true };
}

/**
 * Purge all auto-indexed inline-edit overrides from site_settings.
 * Only removes keys matching `inline_edit:{path}:{number}` patterns,
 * NOT profile-based keys (profile:uuid:field).
 */
export async function purgeInlineOverrides(pathname?: string) {
  const { requireAdmin } = await import("@/utils/auth");
  const permResult = await requireAdmin();
  if ("error" in permResult) return { error: permResult.error };

  const admin = createAdminClient();
  const prefix = pathname
    ? `inline_edit:${pathname === "/" ? "/" : pathname.replace(/\/+$/, "")}:`
    : "inline_edit:";

  const { data, error } = await admin
    .from("site_settings")
    .select("key")
    .like("key", `${prefix}%`);

  if (error) return { error: "Error al leer overrides." };
  if (!data || data.length === 0) return { deleted: 0 };

  const keysToDelete = data.map((row) => String(row.key));
  const { error: delError } = await admin
    .from("site_settings")
    .delete()
    .in("key", keysToDelete);

  if (delError) return { error: "Error al eliminar overrides." };

  revalidatePath("/");
  revalidatePath("/nosotros");
  return { deleted: keysToDelete.length };
}
