"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { bilingualFromSource } from "@/utils/autoTranslate";

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
