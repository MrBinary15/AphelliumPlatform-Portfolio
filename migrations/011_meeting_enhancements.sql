-- ============================================================
-- 011: Meeting enhancements – privacy, public, reactions, annotations
-- ============================================================

-- New columns on meetings
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS is_public  BOOLEAN DEFAULT false;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS is_locked  BOOLEAN DEFAULT false;

-- Expand message_type to include file & reaction
ALTER TABLE meeting_messages DROP CONSTRAINT IF EXISTS meeting_messages_message_type_check;
ALTER TABLE meeting_messages ADD CONSTRAINT meeting_messages_message_type_check
  CHECK (message_type IN ('text', 'system', 'hand_raise', 'file', 'reaction'));

-- Lightweight reactions table (realtime-enabled)
CREATE TABLE IF NOT EXISTS meeting_reactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE meeting_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY mr_select ON meeting_reactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM meetings WHERE id = meeting_id AND (
    is_public = true
    OR host_id = auth.uid()
    OR co_host_id = auth.uid()
    OR id IN (SELECT mp.meeting_id FROM meeting_participants mp WHERE mp.user_id = auth.uid())
  ))
);
CREATE POLICY mr_insert ON meeting_reactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE meeting_reactions;

-- Update the meetings_select policy to include public meetings
DROP POLICY IF EXISTS meetings_select ON meetings;
CREATE POLICY meetings_select ON meetings FOR SELECT USING (
  is_public = true
  OR host_id = auth.uid()
  OR co_host_id = auth.uid()
  OR id IN (SELECT meeting_id FROM meeting_participants WHERE user_id = auth.uid())
  OR id IN (SELECT meeting_id FROM meeting_invitations WHERE user_id = auth.uid())
);

-- Direct calls: lock + max 2 participants (run manually after migration)
-- UPDATE meetings SET is_locked = true, max_participants = 2 WHERE title LIKE 'Llamada con %';
