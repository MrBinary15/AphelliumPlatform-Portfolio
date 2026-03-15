"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createNoticia(formData: FormData) {
  const supabase = await createClient();

  const title = formData.get("title") as string;
  const excerpt = formData.get("excerpt") as string;
  const content = formData.get("content") as string;
  const category = formData.get("category") as string;
  const imgFile = formData.get("image") as File | null;

  console.log("createNoticia received:", { title, excerpt, category, imgFile: imgFile ? { name: imgFile.name, size: imgFile.size, type: imgFile.type } : null });

  if (!title || !content) {
    return { error: "El título y el contenido son obligatorios." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autorizado." };
  }

  let finalImgUrl = null;

  if (imgFile && imgFile.size > 0) {
    const fileExt = imgFile.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('noticias')
      .upload(`public/${fileName}`, imgFile);

    if (uploadError) {
      console.error("Error uploading image:", uploadError);
      return { error: "Hubo un error al subir la imagen." };
    }

    const { data: { publicUrl } } = supabase.storage
      .from('noticias')
      .getPublicUrl(`public/${fileName}`);
      
    finalImgUrl = publicUrl;
    console.log("Image uploaded successfully, generated URL:", finalImgUrl);
  } else {
    console.log("No valid imgFile found or size is 0");
  }

  const { error } = await supabase.from("noticias").insert({
    title,
    excerpt,
    content,
    category,
    img_url: finalImgUrl,
    author_id: user.id,
  });

  if (error) {
    console.error("Error creating noticia:", error);
    return { error: "Hubo un error al crear la noticia." };
  }

  revalidatePath("/admin/noticias");
  revalidatePath("/noticias"); // Revalidate public news page as well
  redirect("/admin/noticias");
}

export async function deleteNoticia(id: string) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autorizado." };
  }

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

  const title = formData.get("title") as string;
  const excerpt = formData.get("excerpt") as string;
  const content = formData.get("content") as string;
  const category = formData.get("category") as string;
  const imgFile = formData.get("image") as File | null;
  const link = formData.get("link") as string;

  if (!title || !content) {
    return { error: "El título y el contenido son obligatorios." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autorizado." };
  }

  let finalImgUrl: string | undefined;

  // Solo si se sube un nuevo archivo
  if (imgFile && imgFile.size > 0) {
    const fileExt = imgFile.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('noticias')
      .upload(`public/${fileName}`, imgFile);

    if (uploadError) {
      console.error("Error uploading image:", uploadError);
      return { error: "Hubo un error al subir la nueva imagen." };
    }

    const { data: { publicUrl } } = supabase.storage
      .from('noticias')
      .getPublicUrl(`public/${fileName}`);
      
    finalImgUrl = publicUrl;
  }

  if (!finalImgUrl) {
    finalImgUrl = (await supabase
      .from("noticias")
      .select("img_url")
      .eq("id", id)
      .single()).data?.img_url; // Obtener la imagen existente desde la base de datos
  }

  const updateData: any = {
    title,
    excerpt,
    content,
    category,
    link, // Agregar el enlace al objeto de datos
  };

  if (finalImgUrl) {
    updateData.img_url = finalImgUrl;
  }

  const { error } = await supabase
    .from("noticias")
    .update(updateData)
    .eq("id", id);

  if (error) {
    console.error("Error updating noticia:", error);
    return { error: "Hubo un error al actualizar la noticia." };
  }

  revalidatePath("/admin/noticias");
  revalidatePath("/noticias"); 
  revalidatePath(`/noticias/${id}`);
  redirect("/admin/noticias");
}
