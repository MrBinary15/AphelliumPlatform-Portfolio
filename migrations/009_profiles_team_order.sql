-- ============================================================
-- 009_profiles_team_order.sql
-- Manual ordering for public team members
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS team_order INTEGER;

-- Initialize order for existing rows (older first keeps stable list)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
  FROM profiles
)
UPDATE profiles p
SET team_order = r.rn
FROM ranked r
WHERE p.id = r.id
  AND p.team_order IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_team_order ON profiles (team_order);
