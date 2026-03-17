"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bilingualFromSource } from "@/utils/autoTranslate";

/* ─── Types ─── */
export type Proyecto = {
  id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  description: string | null;
  category: string | null;
  status: "planning" | "active" | "completed" | "paused";
  img_url: string | null;
  client_name: string | null;
  client_type: "propio" | "un_cliente" | "varios_clientes" | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  metrics: { label: string; value: string }[];
  gallery: string[];
  tags: string[];
  featured: boolean;
  title_es: string | null;
  title_en: string | null;
  excerpt_es: string | null;
  excerpt_en: string | null;
  description_es: string | null;
  description_en: string | null;
  category_es: string | null;
  category_en: string | null;
  author_id: string | null;
  created_at: string;
  updated_at: string;
};

/* ─── Helpers ─── */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function uploadProjectImage(
  file: File | null,
  prefix: string = "cover"
): Promise<string | null> {
  if (!file || file.size <= 0) return null;

  const admin = createAdminClient();
  const ext = (file.name.split(".").pop() || "jpg").replace(/[^a-zA-Z0-9]/g, "");
  const fileName = `${prefix}/${crypto.randomUUID()}.${ext}`;

  const { error } = await admin.storage
    .from("proyectos")
    .upload(fileName, file, { upsert: false });

  if (error) {
    // Fallback: try uploading to noticias bucket
    const { error: fallbackErr } = await admin.storage
      .from("noticias")
      .upload(`proyectos/${fileName}`, file, { upsert: false });
    if (fallbackErr) throw fallbackErr;

    const { data: { publicUrl } } = admin.storage
      .from("noticias")
      .getPublicUrl(`proyectos/${fileName}`);
    return publicUrl;
  }

  const { data: { publicUrl } } = admin.storage
    .from("proyectos")
    .getPublicUrl(fileName);
  return publicUrl;
}

async function translateInBackground(
  id: string,
  fields: { title: string; excerpt: string; description: string; category: string }
) {
  try {
    const admin = createAdminClient();
    const [t, e, d, c] = await Promise.all([
      bilingualFromSource(fields.title),
      bilingualFromSource(fields.excerpt || ""),
      bilingualFromSource(fields.description || ""),
      bilingualFromSource(fields.category || ""),
    ]);

    await admin.from("proyectos").update({
      title_es: t.es, title_en: t.en,
      excerpt_es: e.es, excerpt_en: e.en,
      description_es: d.es, description_en: d.en,
      category_es: c.es, category_en: c.en,
    }).eq("id", id);

    revalidatePath("/proyectos");
    revalidatePath("/admin/proyectos");
  } catch (err) {
    console.error("Error translating project:", err);
  }
}

/* ─── Actions ─── */
export async function createProyecto(formData: FormData) {
  // --- RBAC: require create_proyecto permission ---
  const { requirePermission } = await import("@/utils/auth");
  const permResult = await requirePermission("create_proyecto");
  if ("error" in permResult) return { error: permResult.error };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado." };

  const title = (formData.get("title") as string || "").trim();
  const excerpt = (formData.get("excerpt") as string || "").trim();
  const description = (formData.get("description") as string || "").trim();
  const category = (formData.get("category") as string || "").trim();
  const status = (formData.get("status") as string || "active") as Proyecto["status"];
  const client_type = (formData.get("client_type") as string || "").trim() || null;
  const client_name = (formData.get("client_name") as string || "").trim();
  const location = (formData.get("location") as string || "").trim();
  const start_date = (formData.get("start_date") as string || "").trim() || null;
  const end_date = (formData.get("end_date") as string || "").trim() || null;
  const featured = formData.get("featured") === "true";
  const metricsRaw = formData.get("metrics") as string || "[]";
  const tagsRaw = (formData.get("tags") as string || "").trim();
  const imgFile = formData.get("image") as File | null;

  if (!title) return { error: "El título es obligatorio." };

  let metrics: { label: string; value: string }[] = [];
  try { metrics = JSON.parse(metricsRaw); } catch { /* keep empty */ }

  const tags = tagsRaw ? tagsRaw.split(",").map(t => t.trim()).filter(Boolean) : [];

  let imgUrl: string | null = null;
  try {
    imgUrl = await uploadProjectImage(imgFile);
  } catch {
    return { error: "Error al subir la imagen." };
  }

  const admin = createAdminClient();

  const payload = {
    title,
    slug: slugify(title),
    excerpt: excerpt || null,
    description: description || null,
    category: category || null,
    status,
    img_url: imgUrl,
    client_type: client_type as Proyecto["client_type"],
    client_name: client_name || null,
    location: location || null,
    start_date,
    end_date,
    metrics,
    tags,
    featured,
    title_es: title,
    title_en: title,
    excerpt_es: excerpt || null,
    excerpt_en: excerpt || null,
    description_es: description || null,
    description_en: description || null,
    category_es: category || null,
    category_en: category || null,
    author_id: user.id,
  };

  const { data, error } = await admin
    .from("proyectos")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    console.error("Error creating project:", error);
    return { error: `Error al crear el proyecto: ${error.message}` };
  }

  if (data?.id) {
    void translateInBackground(data.id, { title, excerpt, description, category });
  }

  revalidatePath("/admin/proyectos");
  revalidatePath("/proyectos");
  redirect("/admin/proyectos");
}

export async function updateProyecto(id: string, formData: FormData) {
  // --- RBAC: require edit_proyecto permission ---
  const { requirePermission } = await import("@/utils/auth");
  const permResult = await requirePermission("edit_proyecto");
  if ("error" in permResult) return { error: permResult.error };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado." };

  const title = (formData.get("title") as string || "").trim();
  const excerpt = (formData.get("excerpt") as string || "").trim();
  const description = (formData.get("description") as string || "").trim();
  const category = (formData.get("category") as string || "").trim();
  const status = (formData.get("status") as string || "active") as Proyecto["status"];
  const client_type = (formData.get("client_type") as string || "").trim() || null;
  const client_name = (formData.get("client_name") as string || "").trim();
  const location = (formData.get("location") as string || "").trim();
  const start_date = (formData.get("start_date") as string || "").trim() || null;
  const end_date = (formData.get("end_date") as string || "").trim() || null;
  const featured = formData.get("featured") === "true";
  const metricsRaw = formData.get("metrics") as string || "[]";
  const tagsRaw = (formData.get("tags") as string || "").trim();
  const imgFile = formData.get("image") as File | null;

  if (!title) return { error: "El título es obligatorio." };

  let metrics: { label: string; value: string }[] = [];
  try { metrics = JSON.parse(metricsRaw); } catch { /* keep empty */ }

  const tags = tagsRaw ? tagsRaw.split(",").map(t => t.trim()).filter(Boolean) : [];

  let imgUrl: string | null | undefined;
  if (imgFile && imgFile.size > 0) {
    try {
      imgUrl = await uploadProjectImage(imgFile);
    } catch {
      return { error: "Error al subir la imagen." };
    }
  }

  const admin = createAdminClient();

  const payload: Record<string, unknown> = {
    title,
    slug: slugify(title),
    excerpt: excerpt || null,
    description: description || null,
    category: category || null,
    status,
    client_type: client_type,
    client_name: client_name || null,
    location: location || null,
    start_date,
    end_date,
    metrics,
    tags,
    featured,
  };

  if (imgUrl !== undefined) {
    payload.img_url = imgUrl;
  }

  const { error } = await admin
    .from("proyectos")
    .update(payload)
    .eq("id", id);

  if (error) {
    console.error("Error updating project:", error);
    return { error: `Error al actualizar: ${error.message}` };
  }

  void translateInBackground(id, { title, excerpt, description, category });

  revalidatePath("/admin/proyectos");
  revalidatePath("/proyectos");
  redirect("/admin/proyectos");
}

export async function deleteProyecto(id: string) {
  // --- RBAC: require delete_proyecto permission ---
  const { requirePermission } = await import("@/utils/auth");
  const permResult = await requirePermission("delete_proyecto");
  if ("error" in permResult) return { error: permResult.error };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado." };

  const admin = createAdminClient();
  const { error } = await admin.from("proyectos").delete().eq("id", id);

  if (error) {
    console.error("Error deleting project:", error);
    return { error: "Error al eliminar el proyecto." };
  }

  revalidatePath("/admin/proyectos");
  revalidatePath("/proyectos");
  return { success: true };
}

export async function addGalleryImage(projectId: string, formData: FormData) {
  // --- RBAC: require edit_proyecto permission ---
  const { requirePermission } = await import("@/utils/auth");
  const permResult = await requirePermission("edit_proyecto");
  if ("error" in permResult) return { error: permResult.error };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado." };

  const file = formData.get("image") as File | null;
  if (!file || file.size <= 0) return { error: "No se proporcionó imagen." };

  let imageUrl: string | null = null;
  try {
    imageUrl = await uploadProjectImage(file, "gallery");
  } catch {
    return { error: "Error al subir la imagen." };
  }

  if (!imageUrl) return { error: "Error al procesar la imagen." };

  const admin = createAdminClient();

  // Get current gallery
  const { data: project } = await admin
    .from("proyectos")
    .select("gallery")
    .eq("id", projectId)
    .single();

  const currentGallery = project?.gallery || [];
  const updatedGallery = [...currentGallery, imageUrl];

  const { error } = await admin
    .from("proyectos")
    .update({ gallery: updatedGallery })
    .eq("id", projectId);

  if (error) return { error: "Error al agregar imagen a la galería." };

  revalidatePath("/admin/proyectos");
  revalidatePath("/proyectos");
  return { success: true, imageUrl };
}

export async function removeGalleryImage(projectId: string, imageUrl: string) {
  // --- RBAC: require edit_proyecto permission ---
  const { requirePermission } = await import("@/utils/auth");
  const permResult = await requirePermission("edit_proyecto");
  if ("error" in permResult) return { error: permResult.error };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado." };

  const admin = createAdminClient();

  const { data: project } = await admin
    .from("proyectos")
    .select("gallery")
    .eq("id", projectId)
    .single();

  const currentGallery = project?.gallery || [];
  const updatedGallery = currentGallery.filter((url: string) => url !== imageUrl);

  const { error } = await admin
    .from("proyectos")
    .update({ gallery: updatedGallery })
    .eq("id", projectId);

  if (error) return { error: "Error al eliminar imagen de la galería." };

  revalidatePath("/admin/proyectos");
  revalidatePath("/proyectos");
  return { success: true };
}
