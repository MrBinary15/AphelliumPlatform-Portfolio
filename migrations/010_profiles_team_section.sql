-- ============================================================
-- 010_profiles_team_section.sql
-- Explicit team section classification for public team rendering
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS team_section TEXT;

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_team_section_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_team_section_check
  CHECK (team_section IN ('founders', 'coordinator', 'technical') OR team_section IS NULL);

CREATE INDEX IF NOT EXISTS idx_profiles_team_section ON profiles (team_section);
