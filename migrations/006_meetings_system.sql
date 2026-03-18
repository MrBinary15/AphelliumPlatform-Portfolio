-- ============================================================
-- 006: Sistema de Reuniones y Videollamadas (LiveKit)
-- ============================================================

-- Tabla principal de reuniones
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  co_host_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'finished', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  max_participants INT DEFAULT 50,
  settings JSONB DEFAULT '{"allow_chat": true, "allow_screen_share": true, "allow_hand_raise": true, "mute_on_join": false, "camera_off_on_join": false}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Participantes de reunión
CREATE TABLE IF NOT EXISTS meeting_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('host', 'co_host', 'participant')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  UNIQUE(meeting_id, user_id)
);

-- Mensajes del chat de la reunión
CREATE TABLE IF NOT EXISTS meeting_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'hand_raise')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Archivos compartidos en la reunión (foro de archivos)
CREATE TABLE IF NOT EXISTS meeting_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  file_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Invitaciones a reuniones
CREATE TABLE IF NOT EXISTS meeting_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(meeting_id, user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_meetings_host ON meetings(host_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled ON meetings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_meetings_slug ON meetings(slug);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting ON meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_user ON meeting_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_messages_meeting ON meeting_messages(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_files_meeting ON meeting_files(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_invitations_user ON meeting_invitations(user_id);

-- RLS
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_invitations ENABLE ROW LEVEL SECURITY;

-- Helper: ¿Es miembro de la reunión?
CREATE OR REPLACE FUNCTION is_meeting_member(p_meeting_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM meeting_participants
    WHERE meeting_id = p_meeting_id AND user_id = p_user_id
  )
  OR EXISTS (
    SELECT 1 FROM meetings
    WHERE id = p_meeting_id AND (host_id = p_user_id OR co_host_id = p_user_id)
  );
$$;

-- Helper: ¿Es host o co-host?
CREATE OR REPLACE FUNCTION is_meeting_host(p_meeting_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM meetings
    WHERE id = p_meeting_id AND (host_id = p_user_id OR co_host_id = p_user_id)
  );
$$;

-- Policies: meetings
CREATE POLICY meetings_select ON meetings FOR SELECT USING (
  host_id = auth.uid()
  OR co_host_id = auth.uid()
  OR id IN (SELECT meeting_id FROM meeting_participants WHERE user_id = auth.uid())
  OR id IN (SELECT meeting_id FROM meeting_invitations WHERE user_id = auth.uid())
);
CREATE POLICY meetings_insert ON meetings FOR INSERT WITH CHECK (host_id = auth.uid());
CREATE POLICY meetings_update ON meetings FOR UPDATE USING (is_meeting_host(id, auth.uid()));
CREATE POLICY meetings_delete ON meetings FOR DELETE USING (host_id = auth.uid());

-- Policies: meeting_participants
CREATE POLICY mp_select ON meeting_participants FOR SELECT USING (is_meeting_member(meeting_id, auth.uid()));
CREATE POLICY mp_insert ON meeting_participants FOR INSERT WITH CHECK (
  user_id = auth.uid() OR is_meeting_host(meeting_id, auth.uid())
);
CREATE POLICY mp_update ON meeting_participants FOR UPDATE USING (is_meeting_host(meeting_id, auth.uid()));
CREATE POLICY mp_delete ON meeting_participants FOR DELETE USING (
  user_id = auth.uid() OR is_meeting_host(meeting_id, auth.uid())
);

-- Policies: meeting_messages
CREATE POLICY mm_select ON meeting_messages FOR SELECT USING (is_meeting_member(meeting_id, auth.uid()));
CREATE POLICY mm_insert ON meeting_messages FOR INSERT WITH CHECK (sender_id = auth.uid() AND is_meeting_member(meeting_id, auth.uid()));

-- Policies: meeting_files
CREATE POLICY mf_select ON meeting_files FOR SELECT USING (is_meeting_member(meeting_id, auth.uid()));
CREATE POLICY mf_insert ON meeting_files FOR INSERT WITH CHECK (uploaded_by = auth.uid() AND is_meeting_member(meeting_id, auth.uid()));
CREATE POLICY mf_delete ON meeting_files FOR DELETE USING (
  uploaded_by = auth.uid() OR is_meeting_host(meeting_id, auth.uid())
);

-- Policies: meeting_invitations
CREATE POLICY mi_select ON meeting_invitations FOR SELECT USING (
  user_id = auth.uid() OR invited_by = auth.uid() OR is_meeting_host(meeting_id, auth.uid())
);
CREATE POLICY mi_insert ON meeting_invitations FOR INSERT WITH CHECK (is_meeting_host(meeting_id, auth.uid()));
CREATE POLICY mi_update ON meeting_invitations FOR UPDATE USING (user_id = auth.uid());

-- Storage bucket para archivos de reuniones
INSERT INTO storage.buckets (id, name, public)
VALUES ('meeting-files', 'meeting-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY meeting_files_upload ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'meeting-files' AND auth.uid() IS NOT NULL);

CREATE POLICY meeting_files_download ON storage.objects FOR SELECT
USING (bucket_id = 'meeting-files' AND auth.uid() IS NOT NULL);

CREATE POLICY meeting_files_delete ON storage.objects FOR DELETE
USING (bucket_id = 'meeting-files' AND auth.uid() IS NOT NULL);

-- Habilitar realtime para mensajes y participantes de reuniones
ALTER PUBLICATION supabase_realtime ADD TABLE meeting_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE meeting_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE meetings;
