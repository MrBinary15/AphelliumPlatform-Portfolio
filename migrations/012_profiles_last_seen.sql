-- Add last_seen_at column to profiles for tracking user's last online time
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
