-- ============================================================
-- Migration: Tasks & Planning System
-- ============================================================

-- 1. Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','en_progreso','completada','cancelada','postergada')),
  priority TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('baja','media','alta','urgente')),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  due_date TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Task assignments (many-to-many: task <-> user)
CREATE TABLE IF NOT EXISTS task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  confirmed BOOLEAN NOT NULL DEFAULT false,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);

-- 3. Task comments (rich text, threaded)
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES task_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Comment reactions (emoji reactions)
CREATE TABLE IF NOT EXISTS task_comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES task_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id, emoji)
);

-- 5. Task attachments (files, photos, videos)
CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Task activity log
CREATE TABLE IF NOT EXISTS task_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user ON task_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_task ON task_activity(task_id);

-- RLS Policies
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_activity ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read tasks they are assigned to or created
CREATE POLICY "tasks_select" ON tasks FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR id IN (SELECT task_id FROM task_assignments WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','coordinador'))
  );

CREATE POLICY "tasks_insert" ON tasks FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','coordinador'))
  );

CREATE POLICY "tasks_update" ON tasks FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','coordinador'))
  );

CREATE POLICY "tasks_delete" ON tasks FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Assignments: admins/coordinadores manage, users read their own
CREATE POLICY "assignments_select" ON task_assignments FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR task_id IN (SELECT id FROM tasks WHERE created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','coordinador'))
  );

CREATE POLICY "assignments_insert" ON task_assignments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','coordinador'))
  );

CREATE POLICY "assignments_update" ON task_assignments FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','coordinador'))
  );

CREATE POLICY "assignments_delete" ON task_assignments FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','coordinador'))
  );

-- Comments: anyone involved can read/write
CREATE POLICY "comments_select" ON task_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "comments_insert" ON task_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "comments_update" ON task_comments FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "comments_delete" ON task_comments FOR DELETE TO authenticated USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','coordinador'))
);

-- Reactions
CREATE POLICY "reactions_select" ON task_comment_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "reactions_insert" ON task_comment_reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "reactions_delete" ON task_comment_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Attachments
CREATE POLICY "attachments_select" ON task_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "attachments_insert" ON task_attachments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "attachments_delete" ON task_attachments FOR DELETE TO authenticated USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','coordinador'))
);

-- Activity log: read by anyone involved
CREATE POLICY "activity_select" ON task_activity FOR SELECT TO authenticated USING (true);
CREATE POLICY "activity_insert" ON task_activity FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('task_attachments', 'task_attachments', true) ON CONFLICT DO NOTHING;

CREATE POLICY "task_attachments_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'task_attachments');

CREATE POLICY "task_attachments_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'task_attachments');

CREATE POLICY "task_attachments_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'task_attachments');
