-- ============================================================
-- 014: Add DELETE policy to webrtc_signals
-- Without this, signal cleanup in useWebRTC and endMeeting
-- was silently failing due to RLS blocking deletes.
-- ============================================================

-- Users can delete their own signals
CREATE POLICY "users can delete own signals"
  ON webrtc_signals FOR DELETE TO authenticated
  USING (sender_id = auth.uid());

-- Meeting hosts can delete all signals in their meeting rooms
CREATE POLICY "host can delete room signals"
  ON webrtc_signals FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = webrtc_signals.room_id
        AND meetings.host_id = auth.uid()
    )
  );
