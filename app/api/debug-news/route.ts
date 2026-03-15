import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase
    .from("noticias")
    .select("id, title, img_url")
    .order("created_at", { ascending: false })
    .limit(2);

  if (error) {
    return NextResponse.json({ error });
  }

  return NextResponse.json(data);
}
