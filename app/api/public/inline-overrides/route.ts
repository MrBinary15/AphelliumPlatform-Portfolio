import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const rawPathname = request.nextUrl.searchParams.get("path") || "/";
    const pathname = rawPathname === "/" ? "/" : rawPathname.replace(/\/+$/, "");
    const admin = createAdminClient();

    const prefix = `inline_edit:${pathname}:`;
    const { data, error } = await admin
      .from("site_settings")
      .select("key, value")
      .like("key", `${prefix}%`);

    if (error) {
      return NextResponse.json({ overrides: {} }, { status: 200 });
    }

    const overrides: Record<string, string> = {};
    for (const row of data || []) {
      const key = String(row.key || "");
      const value = String(row.value || "");
      const shortKey = key.startsWith(prefix) ? key.slice(prefix.length) : "";
      if (!shortKey) continue;

      // New normalized format stores only index-like short keys, while legacy
      // rows may still include `${pathname}:index` in the suffix.
      overrides[shortKey] = value;
      if (!shortKey.startsWith(`${pathname}:`)) {
        overrides[`${pathname}:${shortKey}`] = value;
      }
    }

    return NextResponse.json({ overrides });
  } catch {
    return NextResponse.json({ overrides: {} }, { status: 200 });
  }
}
