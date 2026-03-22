-- ============================================================
-- 014: Set REPLICA IDENTITY FULL on meeting_invitations
-- Required for Supabase Realtime to deliver UPDATE events
-- with server-side column filters (e.g. user_id=eq.xxx).
-- Without FULL, UPDATE payloads only contain the primary key,
-- so the user_id filter never matches and notifications are lost.
-- ============================================================
ALTER TABLE meeting_invitations REPLICA IDENTITY FULL;
