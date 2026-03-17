import { cookies } from "next/headers";

export type Language = "es" | "en";

export function normalizeLanguage(value?: string | null): Language {
  return value === "en" ? "en" : "es";
}

export async function getServerLanguage(): Promise<Language> {
  const cookieStore = await cookies();
  return normalizeLanguage(cookieStore.get("aphellium_lang")?.value);
}

export function pickLocalizedField(
  data: Record<string, unknown> | null | undefined,
  baseField: string,
  lang: Language,
  options?: { fallbackToBase?: boolean },
): string {
  const fallbackToBase = options?.fallbackToBase ?? true;

  if (!data) return "";

  const localizedKey = `${baseField}_${lang}`;
  const localizedValue = data[localizedKey];
  if (typeof localizedValue === "string" && localizedValue.trim().length > 0) {
    return localizedValue;
  }

  if (fallbackToBase) {
    const baseValue = data[baseField];
    if (typeof baseValue === "string") {
      return baseValue;
    }
  }

  return "";
}
