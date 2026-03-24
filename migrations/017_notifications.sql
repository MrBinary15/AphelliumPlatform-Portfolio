-- 017 Notifications System
-- In-app notification centre for all platform events.

CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text NOT NULL DEFAULT 'general',   -- task, meeting, message, noticia, proyecto, general
  title       text NOT NULL,
  body        text,
  url         text,                               -- deep-link within admin portal
  read        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can insert/delete any notification
CREATE POLICY "Service insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service delete notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false;
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
