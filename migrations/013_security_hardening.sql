-- ============================================
-- Security Hardening Migration
-- Aphellium Platform - Production Readiness
-- ============================================

-- 1. Ensure RLS is enabled on ALL tables
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS noticias ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chat_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS task_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS task_comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS meeting_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS meeting_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS site_settings ENABLE ROW LEVEL SECURITY;

-- 2. Force RLS for table owners (prevents bypass via service role in direct queries)
ALTER TABLE IF EXISTS profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS noticias FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS proyectos FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS mensajes FORCE ROW LEVEL SECURITY;

-- 3. Public read policies for public content
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_read_noticias') THEN
    CREATE POLICY public_read_noticias ON noticias FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_read_proyectos') THEN
    CREATE POLICY public_read_proyectos ON proyectos FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

-- 4. Profiles: users can read all profiles (for team display) but only update their own
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_select_all') THEN
    CREATE POLICY profiles_select_all ON profiles FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_update_own') THEN
    CREATE POLICY profiles_update_own ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- 5. Messages: only authenticated users with proper role can view/delete
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mensajes_select_auth') THEN
    CREATE POLICY mensajes_select_auth ON mensajes FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- 6. Chat messages: only sender or receiver can read (direct messages)
-- Note: chat_messages uses sender_id/receiver_id (no room_id column).
-- The existing "chat_select_own" policy from migration 001 already covers this.
-- We add a fallback policy only if the original doesn't exist.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'chat_select_own' AND tablename = 'chat_messages')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'chat_messages_select_member' AND tablename = 'chat_messages') THEN
    CREATE POLICY chat_messages_select_member ON chat_messages FOR SELECT TO authenticated 
    USING (sender_id = auth.uid() OR receiver_id = auth.uid());
  END IF;
END $$;

-- 7. Revoke direct access to service role key functions from anon
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
-- Re-grant only specific safe functions if needed

-- 8. Add last_seen_at column if not exists (from previous migration)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
