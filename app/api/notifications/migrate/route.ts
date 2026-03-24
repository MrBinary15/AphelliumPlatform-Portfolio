import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Only admin can run migration
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Solo admin" }, { status: 403 });

  const admin = createAdminClient();

  const sql = `
    CREATE TABLE IF NOT EXISTS notifications (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      type        text NOT NULL DEFAULT 'general',
      title       text NOT NULL,
      body        text,
      url         text,
      read        boolean NOT NULL DEFAULT false,
      created_at  timestamptz NOT NULL DEFAULT now()
    );

    DO $$ BEGIN
      ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN others THEN NULL;
    END $$;

    DO $$ BEGIN
      CREATE POLICY "Users read own notifications"
        ON notifications FOR SELECT
        USING (auth.uid() = user_id);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      CREATE POLICY "Users update own notifications"
        ON notifications FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      CREATE POLICY "Service insert notifications"
        ON notifications FOR INSERT
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      CREATE POLICY "Service delete notifications"
        ON notifications FOR DELETE
        USING (auth.uid() = user_id);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false;
    CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
  `;

  try {
    // Use admin client to execute raw SQL via rpc or direct query
    const { error } = await admin.rpc("exec_sql", { query: sql });
    if (error) {
      // If exec_sql doesn't exist, try individual table creation
      const { error: tableErr } = await admin.from("notifications").select("id").limit(1);
      if (tableErr?.code === "42P01") {
        return NextResponse.json({ error: "Table doesn't exist. Run migration SQL in Supabase SQL Editor.", sql });
      }
      return NextResponse.json({ exists: true, message: "Table already exists" });
    }
    return NextResponse.json({ success: true });
  } catch {
    // Check if table already exists
    const { error: checkErr } = await admin.from("notifications").select("id").limit(1);
    if (!checkErr) return NextResponse.json({ exists: true, message: "Table already exists" });
    return NextResponse.json({ error: "Run migration manually", sql }, { status: 500 });
  }
}
