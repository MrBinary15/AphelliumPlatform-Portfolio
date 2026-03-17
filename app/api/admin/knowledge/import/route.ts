import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/utils/auth";
import { createAdminClient } from "@/utils/supabase/admin";
import * as mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import * as XLSX from "xlsx";
import JSZip from "jszip";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_TOTAL_CHARS = 120_000;
const CHUNK_SIZE = 6000;

type ImportCategory =
  | "general"
  | "productos"
  | "servicios"
  | "tecnologia"
  | "preguntas_frecuentes"
  | "politicas"
  | "soporte";

function normalizeText(input: string): string {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getBaseName(fileName: string): string {
  const cleaned = fileName.replace(/\.[^.]+$/, "").trim();
  return cleaned || "Documento sin titulo";
}

function splitIntoChunks(text: string, chunkSize: number): string[] {
  if (text.length <= chunkSize) return [text];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);
    if (end < text.length) {
      const nearestBreak = text.lastIndexOf("\n", end);
      if (nearestBreak > start + Math.floor(chunkSize * 0.55)) {
        end = nearestBreak;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end;
  }

  return chunks.filter(Boolean);
}

function parseCsvLike(content: string): string {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines
    .map((line) => line.split(/[;,\t]/).map((cell) => cell.trim()).filter(Boolean).join(" | "))
    .filter(Boolean)
    .join("\n");
}

async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const mime = (file.type || "").toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".markdown") || name.endsWith(".log")) {
    return normalizeText(buffer.toString("utf8"));
  }

  if (name.endsWith(".json")) {
    const jsonRaw = buffer.toString("utf8");
    try {
      const parsed = JSON.parse(jsonRaw);
      return normalizeText(JSON.stringify(parsed, null, 2));
    } catch {
      return normalizeText(jsonRaw);
    }
  }

  if (name.endsWith(".csv") || mime.includes("csv")) {
    return normalizeText(parseCsvLike(buffer.toString("utf8")));
  }

  if (name.endsWith(".xml") || mime.includes("xml") || name.endsWith(".html") || name.endsWith(".htm")) {
    const raw = buffer.toString("utf8");
    const withoutTags = raw.replace(/<[^>]+>/g, " ");
    return normalizeText(withoutTags);
  }

  if (name.endsWith(".docx") || mime.includes("wordprocessingml")) {
    const result = await mammoth.extractRawText({ buffer });
    return normalizeText(result.value || "");
  }

  if (name.endsWith(".odt") || mime.includes("opendocument")) {
    const zip = await JSZip.loadAsync(buffer);
    const contentXml = await zip.file("content.xml")?.async("string");
    if (!contentXml) return "";
    const withoutTags = contentXml
      .replace(/<text:line-break\s*\/?>/g, "\n")
      .replace(/<text:p[^>]*>/g, "\n")
      .replace(/<text:h[^>]*>/g, "\n")
      .replace(/<[^>]+>/g, " ");
    return normalizeText(withoutTags);
  }

  if (name.endsWith(".pdf") || mime.includes("pdf")) {
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    await parser.destroy();
    return normalizeText(parsed.text || "");
  }

  if (name.endsWith(".xlsx") || name.endsWith(".xls") || mime.includes("spreadsheet") || mime.includes("excel")) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetTexts = workbook.SheetNames.map((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, { header: 1, defval: "" });
      const serialized = rows
        .map((row) => row.map((cell) => String(cell ?? "").trim()).filter(Boolean).join(" | "))
        .filter(Boolean)
        .join("\n");

      return `# Hoja: ${sheetName}\n${serialized}`;
    });

    return normalizeText(sheetTexts.join("\n\n"));
  }

  throw new Error("Formato no soportado. Usa: txt, md, json, csv, xml, html, docx, odt, pdf, xls, xlsx");
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const categoryRaw = String(formData.get("category") || "general").trim();
    const category = (categoryRaw || "general") as ImportCategory;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Debes adjuntar un archivo" }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: "El archivo esta vacio" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "El archivo excede 10MB" }, { status: 400 });
    }

    const extracted = await extractText(file);
    if (!extracted) {
      return NextResponse.json({ error: "No se pudo extraer texto del archivo" }, { status: 400 });
    }

    const limitedText = extracted.slice(0, MAX_TOTAL_CHARS);
    const chunks = splitIntoChunks(limitedText, CHUNK_SIZE);
    if (chunks.length === 0) {
      return NextResponse.json({ error: "El archivo no contiene texto utilizable" }, { status: 400 });
    }

    const baseTitle = getBaseName(file.name);
    const now = new Date().toISOString();

    const records = chunks.map((content, index) => ({
      title: chunks.length === 1 ? baseTitle : `${baseTitle} (Parte ${index + 1}/${chunks.length})`,
      content,
      category,
      created_by: admin.auth.user.id,
      created_at: now,
      updated_at: now,
    }));

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("knowledge_documents")
      .insert(records)
      .select("id, title, content, category, created_at, updated_at");

    if (error) {
      return NextResponse.json({ error: "No se pudo guardar el documento" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      imported: data?.length || 0,
      originalFileName: file.name,
      charsExtracted: limitedText.length,
      docs: data || [],
      truncated: extracted.length > MAX_TOTAL_CHARS,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado al importar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
