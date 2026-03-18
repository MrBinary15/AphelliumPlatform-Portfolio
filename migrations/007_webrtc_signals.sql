-- ============================================================
-- 007_webrtc_signals.sql
-- P2P WebRTC signaling via Supabase Realtime
-- ============================================================

-- Table to exchange SDP offers/answers and ICE candidates
CREATE TABLE IF NOT EXISTS webrtc_signals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('offer', 'answer', 'candidate')),
  payload     JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webrtc_signals_room ON webrtc_signals (room_id, created_at);

-- Row Level Security
ALTER TABLE webrtc_signals ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can insert their own signals
CREATE POLICY "authenticated can send signals"
  ON webrtc_signals FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- Any authenticated user can read signals in active meetings
CREATE POLICY "authenticated can read signals"
  ON webrtc_signals FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = webrtc_signals.room_id
        AND meetings.status IN ('planned', 'active')
    )
  );

-- Enable Realtime so clients receive signals instantly
ALTER PUBLICATION supabase_realtime ADD TABLE webrtc_signals;
