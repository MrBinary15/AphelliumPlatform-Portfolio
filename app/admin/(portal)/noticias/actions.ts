"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bilingualFromSource } from "@/utils/autoTranslate";

type NoticiaUpdatePayload = {
  [key: string]: unknown;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  img_url?: string;
  link?: string | null;
  title_es?: string;
  title_en?: string;
  excerpt_es?: string;
  excerpt_en?: string;
  content_es?: string;
  content_en?: string;
  category_es?: string;
  category_en?: string;
  embed?: string | null;
  embed_code?: string | null;
  embed_html?: string | null;
  oembed_html?: string | null;
};

function extractMeaningfulText(htmlOrText: string) {
  return htmlOrText
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasInlineIframe(htmlOrText: string) {
  return /<iframe[\s\S]*?<\/iframe>/i.test(htmlOrText);
}

function buildLinkAliasPayload(value: string | null): Record<string, string | null> {
  return {
    link: value,
    source_url: value,
    external_url: value,
    url_publicacion: value,
  };
}

function buildEmbedAliasPayload(value: string | null): Record<string, string | null> {
  return {
    embed: value,
    embed_code: value,
    embed_html: value,
    oembed_html: value,
  };
}

async function uploadNoticiaImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  imgFile: File | null,
): Promise<string | null> {
  if (!imgFile || imgFile.size <= 0) return null;

  const fileExt = imgFile.name.split(".").pop();
  const safeExt = (fileExt || "jpg").replace(/[^a-zA-Z0-9]/g, "");
  const fileName = `${crypto.randomUUID()}.${safeExt}`;

  const { error: uploadError } = await supabase.storage
    .from("noticias")
    .upload(`public/${fileName}`, imgFile, { upsert: false });

  if (uploadError) {
    throw uploadError;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("noticias").getPublicUrl(`public/${fileName}`);

  return publicUrl;
}

function getMissingColumnName(error: { message?: string } | null): string | null {
  const message = error?.message || "";
  const match = message.match(/Could not find the '([^']+)' column/i);
  return match?.[1] || null;
}

function dropKeyFromPayload<T extends Record<string, unknown>>(payload: T, key: string): T {
  const next = { ...payload };
  delete next[key];
  return next as T;
}

async function insertNoticiaWithSchemaFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  payload: Record<string, unknown>,
) {
  let currentPayload = { ...payload };

  for (let attempt = 0; attempt < 12; attempt++) {
    const { data, error } = await supabase
      .from("noticias")
      .insert(currentPayload)
      .select("id")
      .single();

    if (!error) {
      return { error: null, data: data as { id: string } | null };
    }

    const missingColumn = getMissingColumnName(error);
    if (!missingColumn || !(missingColumn in currentPayload)) {
      return { error, data: null };
    }

    currentPayload = dropKeyFromPayload(currentPayload, missingColumn);
  }

  return { error: { message: "No se pudo insertar la noticia por incompatibilidad de esquema." }, data: null };
}

function buildTemporaryLocalizedFields(title: string, excerpt: string, content: string, category: string) {
  return {
    title_es: title,
    title_en: title,
    excerpt_es: excerpt,
    excerpt_en: excerpt,
    content_es: content,
    content_en: content,
    category_es: category,
    category_en: category,
  };
}

async function backfillLocalizedFieldsInBackground(
  id: string,
  fields: { title: string; excerpt: string; content: string; category: string },
) {
  try {
    const supabase = await createClient();
    const [bilingualTitle, bilingualExcerpt, bilingualContent, bilingualCategory] = await Promise.all([
      bilingualFromSource(fields.title),
      bilingualFromSource(fields.excerpt),
      bilingualFromSource(fields.content),
      bilingualFromSource(fields.category),
    ]);

    const localizedFields = {
      title_es: bilingualTitle.es,
      title_en: bilingualTitle.en,
      excerpt_es: bilingualExcerpt.es,
      excerpt_en: bilingualExcerpt.en,
      content_es: bilingualContent.es,
      content_en: bilingualContent.en,
      category_es: bilingualCategory.es,
      category_en: bilingualCategory.en,
    };

    await updateNoticiaWithSchemaFallback(supabase, id, localizedFields);
    revalidatePath("/noticias");
    revalidatePath(`/noticias-principal/${id}`);
  } catch (error) {
    console.error("Error en traduccion en segundo plano:", error);
  }
}

async function updateNoticiaWithSchemaFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  payload: Record<string, unknown>,
) {
  let currentPayload = { ...payload };

  for (let attempt = 0; attempt < 12; attempt++) {
    const { error } = await supabase
      .from("noticias")
      .update(currentPayload)
      .eq("id", id);

    if (!error) {
      return { error: null };
    }

    const missingColumn = getMissingColumnName(error);
    if (!missingColumn || !(missingColumn in currentPayload)) {
      return { error };
    }

    currentPayload = dropKeyFromPayload(currentPayload, missingColumn);
  }

  return { error: { message: "No se pudo actualizar la noticia por incompatibilidad de esquema." } };
}

export async function createNoticia(formData: FormData) {
  const supabase = await createClient();

  // --- RBAC: require create_noticia permission ---
  const { requirePermission } = await import("@/utils/auth");
  const permResult = await requirePermission("create_noticia");
  if ("error" in permResult) return { error: permResult.error };

  const title = ((formData.get("title") as string) || "").trim();
  const excerpt = formData.get("excerpt") as string;
  const rawContent = (formData.get("content") as string) || "";
  const category = formData.get("category") as string;
  const link = ((formData.get("link") as string) || "").trim();
  const embedInput = ((formData.get("embed_code") as string) || "").trim();
  const imgFile = formData.get("image") as File | null;

  const hasContent = extractMeaningfulText(rawContent).length > 0;
  const hasInlineEmbed = hasInlineIframe(rawContent);
  const hasEmbed = embedInput.length > 0;
  const baseContent = (hasContent || hasInlineEmbed) ? rawContent : (link ? `<p>${link}</p>` : "");
  const shouldAppendEmbedToContent = hasEmbed && !baseContent.includes("<iframe");
  const content = shouldAppendEmbedToContent
    ? `${baseContent}${baseContent ? "\n" : ""}${embedInput}`
    : baseContent;

  console.log("createNoticia received:", { title, excerpt, category, imgFile: imgFile ? { name: imgFile.name, size: imgFile.size, type: imgFile.type } : null });

  if (!title || (!hasContent && !hasInlineEmbed && !link && !hasEmbed)) {
    return { error: "El titulo es obligatorio y debes escribir contenido en el editor (incluye embeds)." };
  }

  const [
    userResult,
    uploadedImageResult,
  ] = await Promise.all([
    supabase.auth.getUser(),
    uploadNoticiaImage(supabase, imgFile).catch((error) => ({ __uploadError: error })),
  ]);

  const {
    data: { user },
  } = userResult;

  if (!user) {
    return { error: "No autorizado." };
  }

  if (uploadedImageResult && typeof uploadedImageResult === "object" && "__uploadError" in uploadedImageResult) {
    console.error("Error uploading image:", uploadedImageResult.__uploadError);
    return { error: "Hubo un error al subir la imagen." };
  }

  const finalImgUrl = typeof uploadedImageResult === "string" ? uploadedImageResult : null;

  const basePayload = {
    title,
    excerpt,
    content,
    category,
    img_url: finalImgUrl,
    author_id: user.id,
  };

  const normalizedLink = link?.trim() || null;
  const normalizedEmbed = embedInput || null;

  const localizedFields = buildTemporaryLocalizedFields(title, excerpt || "", content, category || "");

  const fullPayload = {
    ...basePayload,
    ...buildLinkAliasPayload(normalizedLink),
    ...buildEmbedAliasPayload(normalizedEmbed),
    ...localizedFields,
  };

  let inserted = false;
  let insertedId: string | null = null;
  let error: { message?: string } | null = null;

  const { error: primaryInsertError, data: primaryInsertData } = await insertNoticiaWithSchemaFallback(supabase, fullPayload);
  if (!primaryInsertError) {
    inserted = true;
    insertedId = primaryInsertData?.id || null;
  } else {
    error = primaryInsertError;
    const fallbackPayload = {
      ...basePayload,
      ...buildLinkAliasPayload(normalizedLink),
      ...buildEmbedAliasPayload(normalizedEmbed),
    };

    const { error: fallbackInsertError, data: fallbackInsertData } = await insertNoticiaWithSchemaFallback(supabase, fallbackPayload);
    if (!fallbackInsertError) {
      inserted = true;
      error = null;
      insertedId = fallbackInsertData?.id || null;
    } else {
      error = fallbackInsertError;
    }
  }

  if (!inserted && error) {
    console.error("Error creating noticia:", error);
    return { error: `Hubo un error al crear la noticia. ${error.message || ""}`.trim() };
  }

  if (insertedId) {
    void backfillLocalizedFieldsInBackground(insertedId, {
      title,
      excerpt: excerpt || "",
      content,
      category: category || "",
    });
  }

  revalidatePath("/admin/noticias");
  revalidatePath("/noticias"); // Revalidate public news page as well
  redirect("/admin/noticias");
}

export async function deleteNoticia(id: string) {
  // --- RBAC: require delete_noticia permission ---
  const { requirePermission } = await import("@/utils/auth");
  const permResult = await requirePermission("delete_noticia");
  if ("error" in permResult) return { error: permResult.error };

  const supabase = await createClient();

  const { error } = await supabase.from("noticias").delete().match({ id });

  if (error) {
    console.error("Error deleting noticia:", error);
    return { error: "Hubo un error al eliminar la noticia." };
  }

  revalidatePath("/noticias");
  revalidatePath("/admin/noticias");
  return { success: true };
}

export async function updateNoticia(id: string, formData: FormData) {
  const supabase = await createClient();

  // --- RBAC: require edit_noticia permission ---
  const { requirePermission } = await import("@/utils/auth");
  const permResult = await requirePermission("edit_noticia");
  if ("error" in permResult) return { error: permResult.error };

  const title = ((formData.get("title") as string) || "").trim();
  const excerpt = formData.get("excerpt") as string;
  const rawContent = (formData.get("content") as string) || "";
  const category = formData.get("category") as string;
  const imgFile = formData.get("image") as File | null;
  const link = ((formData.get("link") as string) || "").trim();
  const embedInput = ((formData.get("embed_code") as string) || "").trim();

  const hasContent = extractMeaningfulText(rawContent).length > 0;
  const hasInlineEmbed = hasInlineIframe(rawContent);
  const hasEmbed = embedInput.length > 0;
  const baseContent = (hasContent || hasInlineEmbed) ? rawContent : (link ? `<p>${link}</p>` : "");
  const shouldAppendEmbedToContent = hasEmbed && !baseContent.includes("<iframe");
  const content = shouldAppendEmbedToContent
    ? `${baseContent}${baseContent ? "\n" : ""}${embedInput}`
    : baseContent;

  if (!title || (!hasContent && !hasInlineEmbed && !link && !hasEmbed)) {
    return { error: "El titulo es obligatorio y debes escribir contenido en el editor (incluye embeds)." };
  }

  const [
    userResult,
    uploadedImageResult,
  ] = await Promise.all([
    supabase.auth.getUser(),
    uploadNoticiaImage(supabase, imgFile).catch((error) => ({ __uploadError: error })),
  ]);

  const {
    data: { user },
  } = userResult;

  if (!user) {
    return { error: "No autorizado." };
  }

  if (uploadedImageResult && typeof uploadedImageResult === "object" && "__uploadError" in uploadedImageResult) {
    console.error("Error uploading image:", uploadedImageResult.__uploadError);
    return { error: "Hubo un error al subir la nueva imagen." };
  }

  let finalImgUrl: string | undefined;
  if (typeof uploadedImageResult === "string") {
    finalImgUrl = uploadedImageResult;
  }

  if (!finalImgUrl) {
    finalImgUrl = (await supabase
      .from("noticias")
      .select("img_url")
      .eq("id", id)
      .single()).data?.img_url; // Obtener la imagen existente desde la base de datos
  }

  const baseUpdateData: NoticiaUpdatePayload = {
    title,
    excerpt,
    content,
    category,
    ...(finalImgUrl ? { img_url: finalImgUrl } : {}),
  };

  const normalizedLink = link?.trim() || null;
  const normalizedEmbed = embedInput || null;

  const localizedFields = buildTemporaryLocalizedFields(title, excerpt || "", content, category || "");

  const fullUpdateData: NoticiaUpdatePayload = {
    ...baseUpdateData,
    ...buildLinkAliasPayload(normalizedLink),
    ...buildEmbedAliasPayload(normalizedEmbed),
    ...localizedFields,
  };

  let updated = false;
  let error: { message?: string } | null = null;

  const { error: primaryUpdateError } = await updateNoticiaWithSchemaFallback(supabase, id, fullUpdateData);
  if (!primaryUpdateError) {
    updated = true;
  } else {
    error = primaryUpdateError;
    const fallbackUpdateData: NoticiaUpdatePayload = {
      ...baseUpdateData,
      ...buildLinkAliasPayload(normalizedLink),
      ...buildEmbedAliasPayload(normalizedEmbed),
    };

    const { error: fallbackUpdateError } = await updateNoticiaWithSchemaFallback(supabase, id, fallbackUpdateData);
    if (!fallbackUpdateError) {
      updated = true;
      error = null;
    } else {
      error = fallbackUpdateError;
    }
  }

  if (!updated && error) {
    console.error("Error updating noticia:", error);
    return { error: `Hubo un error al actualizar la noticia. ${error.message || ""}`.trim() };
  }

  void backfillLocalizedFieldsInBackground(id, {
    title,
    excerpt: excerpt || "",
    content,
    category: category || "",
  });

  revalidatePath("/admin/noticias");
  revalidatePath("/noticias"); 
  revalidatePath(`/noticias/${id}`);
  redirect("/admin/noticias");
}
