-- ============================================================
-- Migration: Group chats + task chat linkage
-- ============================================================

-- Helpers (idempotent)
CREATE OR REPLACE FUNCTION is_admin_or_coordinador(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = user_uuid
      AND role IN ('admin', 'coordinador')
  );
$$;

CREATE OR REPLACE FUNCTION is_chat_room_member(room_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  IF to_regclass('public.chat_room_members') IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.chat_room_members
    WHERE room_id = room_uuid
      AND user_id = user_uuid
  );
END;
$$;

-- Rooms
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  room_type TEXT NOT NULL DEFAULT 'manual' CHECK (room_type IN ('manual', 'task')),
  task_id UUID UNIQUE REFERENCES tasks(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_rooms_room_type ON chat_rooms(room_type);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_task_id ON chat_rooms(task_id);

-- Room members
CREATE TABLE IF NOT EXISTS chat_room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_room_members_room ON chat_room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_room_members_user ON chat_room_members(user_id);

-- Room messages
CREATE TABLE IF NOT EXISTS chat_room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_room_messages_room_created ON chat_room_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_room_messages_sender ON chat_room_messages(sender_id);

ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_rooms_select" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_insert" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_update" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_delete" ON chat_rooms;

CREATE POLICY "chat_rooms_select" ON chat_rooms FOR SELECT TO authenticated
  USING (
    is_chat_room_member(id, auth.uid())
    OR is_admin_or_coordinador(auth.uid())
  );

CREATE POLICY "chat_rooms_insert" ON chat_rooms FOR INSERT TO authenticated
  WITH CHECK (
    is_admin_or_coordinador(auth.uid())
  );

CREATE POLICY "chat_rooms_update" ON chat_rooms FOR UPDATE TO authenticated
  USING (
    is_admin_or_coordinador(auth.uid())
  );

CREATE POLICY "chat_rooms_delete" ON chat_rooms FOR DELETE TO authenticated
  USING (
    is_admin_or_coordinador(auth.uid())
  );

DROP POLICY IF EXISTS "chat_room_members_select" ON chat_room_members;
DROP POLICY IF EXISTS "chat_room_members_insert" ON chat_room_members;
DROP POLICY IF EXISTS "chat_room_members_delete" ON chat_room_members;

CREATE POLICY "chat_room_members_select" ON chat_room_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_chat_room_member(room_id, auth.uid())
    OR is_admin_or_coordinador(auth.uid())
  );

CREATE POLICY "chat_room_members_insert" ON chat_room_members FOR INSERT TO authenticated
  WITH CHECK (
    is_admin_or_coordinador(auth.uid())
  );

CREATE POLICY "chat_room_members_delete" ON chat_room_members FOR DELETE TO authenticated
  USING (
    is_admin_or_coordinador(auth.uid())
  );

DROP POLICY IF EXISTS "chat_room_messages_select" ON chat_room_messages;
DROP POLICY IF EXISTS "chat_room_messages_insert" ON chat_room_messages;
DROP POLICY IF EXISTS "chat_room_messages_update" ON chat_room_messages;
DROP POLICY IF EXISTS "chat_room_messages_delete" ON chat_room_messages;

CREATE POLICY "chat_room_messages_select" ON chat_room_messages FOR SELECT TO authenticated
  USING (
    is_chat_room_member(room_id, auth.uid())
    OR is_admin_or_coordinador(auth.uid())
  );

CREATE POLICY "chat_room_messages_insert" ON chat_room_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      is_chat_room_member(room_id, auth.uid())
      OR is_admin_or_coordinador(auth.uid())
    )
  );

CREATE POLICY "chat_room_messages_update" ON chat_room_messages FOR UPDATE TO authenticated
  USING (
    sender_id = auth.uid()
    OR is_admin_or_coordinador(auth.uid())
  );

CREATE POLICY "chat_room_messages_delete" ON chat_room_messages FOR DELETE TO authenticated
  USING (
    sender_id = auth.uid()
    OR is_admin_or_coordinador(auth.uid())
  );

ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_room_members;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_room_messages;
