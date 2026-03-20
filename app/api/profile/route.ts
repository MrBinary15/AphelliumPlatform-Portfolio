import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { rateLimit, getClientIp } from "@/utils/rateLimit";

type ProfilePayload = {
  full_name?: string;
  job_title?: string;
  description?: string;
  avatar_url?: string;
};

function normalizeText(value: unknown, maxLen: number) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.slice(0, maxLen);
}

async function updateProfileInDb(payload: ProfilePayload, userId: string) {
  const admin = createAdminClient();

  const updates: ProfilePayload & { id: string } = { id: userId };
  if (payload.full_name !== undefined) updates.full_name = payload.full_name;
  if (payload.job_title !== undefined) updates.job_title = payload.job_title;
  if (payload.description !== undefined) updates.description = payload.description;
  if (payload.avatar_url !== undefined) updates.avatar_url = payload.avatar_url;

  const { error } = await admin
    .from("profiles")
    .upsert(updates, { onConflict: "id" });

  if (error) {
    return NextResponse.json({ error: "Error al actualizar perfil" }, { status: 500 });
  }

  revalidatePath("/admin/perfil");
  revalidatePath("/nosotros");

  return NextResponse.json({ success: true });
}

export async function PUT(request: Request) {
  // Rate limit: 20 profile updates per minute
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`profile:${ip}`, { limit: 20, windowMs: 60_000 });
  if (!rl.success) {
    return NextResponse.json({ error: "Demasiadas solicitudes." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const payload: ProfilePayload = {
    full_name: normalizeText(body.full_name, 120),
    job_title: normalizeText(body.job_title, 120),
    description: normalizeText(body.description, 900),
  };

  return updateProfileInDb(payload, user.id);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const formData = await request.formData();
  const fullName = normalizeText(formData.get("full_name"), 120);
  const jobTitle = normalizeText(formData.get("job_title"), 120);
  const description = normalizeText(formData.get("description"), 900);
  const avatarFile = formData.get("avatar_file") as File | null;

  let avatarUrl: string | undefined;

  if (avatarFile && avatarFile.size > 0 && avatarFile.name !== "undefined") {
    const fileExt = avatarFile.name.split(".").pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await admin.storage
      .from("avatars")
      .upload(fileName, avatarFile, { upsert: true });

    if (uploadError) {
      return NextResponse.json({ error: "Error al subir imagen" }, { status: 500 });
    }

    if (uploadData?.path) {
      const { data: publicUrlData } = admin.storage
        .from("avatars")
        .getPublicUrl(uploadData.path);
      avatarUrl = publicUrlData.publicUrl;
    }
  }

  return updateProfileInDb(
    {
      full_name: fullName,
      job_title: jobTitle,
      description,
      avatar_url: avatarUrl,
    },
    user.id,
  );
}
