import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

type TeamMember = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  description: string | null;
  role: string | null;
  team_order: number | null;
  team_section?: string | null;
};

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("id, full_name, avatar_url, job_title, description, role, team_order, team_section")
      .not("role", "eq", "visitante")
      .order("team_section", { ascending: true, nullsFirst: false })
      .order("team_order", { ascending: true, nullsFirst: false })
      .order("full_name", { ascending: true });

    if (!error) {
      return NextResponse.json({ teamMembers: (data || []) as TeamMember[] });
    }

    // Fallback for environments without team_order migration.
    const { data: fallbackData, error: fallbackError } = await admin
      .from("profiles")
      .select("id, full_name, avatar_url, job_title, description, role")
      .not("role", "eq", "visitante")
      .order("full_name", { ascending: true });

    if (fallbackError) {
      return NextResponse.json({ error: "No se pudo cargar el equipo." }, { status: 500 });
    }

    return NextResponse.json({ teamMembers: (fallbackData || []) as TeamMember[] });
  } catch {
    return NextResponse.json({ error: "Error inesperado al cargar el equipo." }, { status: 500 });
  }
}
