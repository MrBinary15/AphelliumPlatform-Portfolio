-- ============================================================
-- 015: access_code column for meetings
-- Allows hosts to protect meetings with an alphanumeric code.
-- NULL means no code required.
-- ============================================================
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS access_code TEXT DEFAULT NULL;
