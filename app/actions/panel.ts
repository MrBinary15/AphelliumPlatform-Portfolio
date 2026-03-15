"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function publishNoticia(formData: FormData) {
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

  const { error } = await supabase.from("noticias").insert({
    title, excerpt, content, category, img_url: finalImgUrl, author_id: user.id,
  });

  if (error) return { error: "Error al publicar la noticia." };

  revalidatePath("/noticias");
  revalidatePath("/admin/noticias");
  return { success: true };
}

export async function publishProyecto(formData: FormData) {
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

  const { error } = await supabase.from("proyectos").insert({
    title, description, excerpt, category, img_url, author_id: user.id,
  });

  if (error) return { error: "Error al publicar el proyecto. ¿Existe la tabla 'proyectos' en Supabase?" };

  revalidatePath("/proyectos");
  return { success: true };
}
