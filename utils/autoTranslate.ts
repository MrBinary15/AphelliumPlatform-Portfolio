import type { Language } from "@/utils/i18n";

const cache = new Map<string, string>();
const MAX_TRANSLATION_CHARS = 900;

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, " ");
}

function isHtmlLike(text: string): boolean {
  return /<[^>]+>/.test(text);
}

function splitLargeText(text: string, maxChars = MAX_TRANSLATION_CHARS): string[] {
  const normalized = text.trim();
  if (!normalized) return [""];
  if (normalized.length <= maxChars) return [normalized];

  const sentences = normalized.match(/[^.!?\n]+[.!?]?\s*/g) ?? [normalized];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + sentence).length <= maxChars) {
      current += sentence;
      continue;
    }

    if (current.trim()) {
      chunks.push(current.trim());
      current = "";
    }

    if (sentence.length <= maxChars) {
      current = sentence;
      continue;
    }

    let start = 0;
    while (start < sentence.length) {
      chunks.push(sentence.slice(start, start + maxChars).trim());
      start += maxChars;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.length > 0 ? chunks : [normalized];
}

export function detectLanguage(text: string): Language {
  const sample = normalizeWhitespace(text).toLowerCase();
  if (!sample) return "es";

  const spanishSignals = /\b(el|la|los|las|de|del|para|con|sin|por|en|y|o|que|una|un|nuestro|nuestra|noticias|proyectos|contacto|sostenible)\b|[áéíóúñ¿¡]/;
  const englishSignals = /\b(the|and|for|with|without|from|to|of|in|on|our|news|projects|contact|sustainable|cooling|trade)\b/;

  if (spanishSignals.test(sample) && !englishSignals.test(sample)) return "es";
  if (englishSignals.test(sample) && !spanishSignals.test(sample)) return "en";

  const accentCount = (sample.match(/[áéíóúñ]/g) || []).length;
  return accentCount > 0 ? "es" : "en";
}

async function translateWithLibreTranslate(text: string, source: Language, target: Language): Promise<string | null> {
  const endpoint = process.env.TRANSLATE_API_URL;
  if (!endpoint) return null;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: text,
      source,
      target,
      format: "text",
    }),
    cache: "no-store",
  });

  if (!response.ok) return null;

  const data = (await response.json()) as { translatedText?: string };
  return data.translatedText ?? null;
}

async function translateWithMyMemory(text: string, source: Language, target: Language): Promise<string | null> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${source}|${target}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;

  const data = (await response.json()) as {
    responseData?: { translatedText?: string };
  };

  return data.responseData?.translatedText ?? null;
}

async function translateChunk(text: string, source: Language, target: Language): Promise<string> {
  const value = text.trim();
  if (!value) return text;

  const cacheKey = `${source}->${target}:${value}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const libre = await translateWithLibreTranslate(value, source, target);
  if (libre && libre.trim().length > 0) {
    cache.set(cacheKey, libre);
    return libre;
  }

  const memory = await translateWithMyMemory(value, source, target);
  if (memory && memory.trim().length > 0) {
    cache.set(cacheKey, memory);
    return memory;
  }

  return value;
}

async function translatePlainText(raw: string, target: Language, source: Language): Promise<string> {
  if (!raw.trim()) return raw;

  const tokens = raw.split(/(\n+)/);
  const translated: string[] = [];

  for (const token of tokens) {
    if (!token || /^\n+$/.test(token)) {
      translated.push(token);
      continue;
    }

    const leading = token.match(/^\s*/)?.[0] ?? "";
    const trailing = token.match(/\s*$/)?.[0] ?? "";
    const core = token.trim();

    if (!core) {
      translated.push(token);
      continue;
    }

    const chunks = splitLargeText(core);
    const translatedChunks: string[] = [];
    for (const chunk of chunks) {
      translatedChunks.push(await translateChunk(chunk, source, target));
    }

    translated.push(`${leading}${translatedChunks.join(" ")}${trailing}`);
  }

  return translated.join("");
}

async function translateHtmlText(raw: string, target: Language, source: Language): Promise<string> {
  const parts = raw.split(/(<[^>]+>)/g);
  const translatedParts: string[] = [];

  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("<") && part.endsWith(">")) {
      translatedParts.push(part);
      continue;
    }

    translatedParts.push(await translatePlainText(part, target, source));
  }

  return translatedParts.join("");
}

export async function translateText(text: string, target: Language): Promise<string> {
  const raw = text ?? "";
  if (!raw.trim()) return raw;

  const sourceText = isHtmlLike(raw) ? stripHtml(raw) : raw;
  const source = detectLanguage(sourceText);
  if (source === target) return raw;

  try {
    if (isHtmlLike(raw)) {
      return await translateHtmlText(raw, target, source);
    }

    return await translatePlainText(raw, target, source);
  } catch {
    return raw;
  }
}

export async function bilingualFromSource(text: string): Promise<{ es: string; en: string; source: Language }> {
  const source = detectLanguage(isHtmlLike(text) ? stripHtml(text) : text);

  if (source === "es") {
    return {
      es: text,
      en: await translateText(text, "en"),
      source,
    };
  }

  return {
    es: await translateText(text, "es"),
    en: text,
    source,
  };
}
