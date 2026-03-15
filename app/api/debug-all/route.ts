import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Try to create a dummy file
  const fileContent = "hello world";
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("noticias")
    .upload(`public/test_${Date.now()}.txt`, fileContent);

  return NextResponse.json({ uploadData, uploadError });
}
