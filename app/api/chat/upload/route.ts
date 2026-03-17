import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

const BUCKET = "chat-files";
const MAX_FILE_BYTES = 15 * 1024 * 1024;

function sanitizeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
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
  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "Archivo invalido" }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "El archivo excede 15MB" }, { status: 400 });
  }

  const { error: bucketError } = await admin.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: `${MAX_FILE_BYTES}`,
  });

  if (
    bucketError
    && !bucketError.message.toLowerCase().includes("already")
    && !bucketError.message.toLowerCase().includes("duplicate")
  ) {
    return NextResponse.json({ error: `No se pudo preparar el bucket: ${bucketError.message}` }, { status: 500 });
  }

  const safeName = sanitizeFileName(file.name || "archivo");
  const filePath = `${user.id}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(filePath, file, {
      upsert: false,
      contentType: file.type || "application/octet-stream",
      cacheControl: "3600",
    });

  if (uploadError) {
    return NextResponse.json({ error: `Error al subir archivo: ${uploadError.message}` }, { status: 500 });
  }

  const { data: signedData, error: signedError } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 60 * 60 * 24 * 365);

  if (signedError || !signedData?.signedUrl) {
    return NextResponse.json({ error: "Archivo subido, pero no se pudo generar enlace" }, { status: 500 });
  }

  return NextResponse.json({
    url: signedData.signedUrl,
    fileName: file.name,
    size: file.size,
    mimeType: file.type || "application/octet-stream",
    storagePath: filePath,
  });
}
