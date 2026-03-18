-- ============================================================
-- 008_meeting_invitations_realtime.sql
-- Enable Realtime on meeting_invitations so ChatWidget
-- receives incoming call notifications instantly.
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE meeting_invitations;
