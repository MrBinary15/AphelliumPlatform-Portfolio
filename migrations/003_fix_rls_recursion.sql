-- ============================================================
-- Fix: infinite recursion in RLS policies (tasks <-> task_assignments)
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create SECURITY DEFINER helpers to break the recursion cycle
CREATE OR REPLACE FUNCTION is_task_assigned_to(task_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM task_assignments WHERE task_id = task_uuid AND user_id = user_uuid);
$$;

CREATE OR REPLACE FUNCTION is_task_creator(task_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM tasks WHERE id = task_uuid AND created_by = user_uuid);
$$;

CREATE OR REPLACE FUNCTION is_admin_or_coordinador(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = user_uuid AND role IN ('admin','coordinador'));
$$;

-- 2. Drop old recursive policies
DROP POLICY IF EXISTS "tasks_select" ON tasks;
DROP POLICY IF EXISTS "tasks_insert" ON tasks;
DROP POLICY IF EXISTS "tasks_update" ON tasks;
DROP POLICY IF EXISTS "tasks_delete" ON tasks;

DROP POLICY IF EXISTS "assignments_select" ON task_assignments;
DROP POLICY IF EXISTS "assignments_insert" ON task_assignments;
DROP POLICY IF EXISTS "assignments_update" ON task_assignments;
DROP POLICY IF EXISTS "assignments_delete" ON task_assignments;

-- 3. Recreate tasks policies using SECURITY DEFINER functions
CREATE POLICY "tasks_select" ON tasks FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR is_task_assigned_to(id, auth.uid())
    OR is_admin_or_coordinador(auth.uid())
  );

CREATE POLICY "tasks_insert" ON tasks FOR INSERT TO authenticated
  WITH CHECK (
    is_admin_or_coordinador(auth.uid())
  );

CREATE POLICY "tasks_update" ON tasks FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR is_admin_or_coordinador(auth.uid())
  );

CREATE POLICY "tasks_delete" ON tasks FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR is_admin_or_coordinador(auth.uid())
  );

-- 4. Recreate task_assignments policies using SECURITY DEFINER functions
CREATE POLICY "assignments_select" ON task_assignments FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_task_creator(task_id, auth.uid())
    OR is_admin_or_coordinador(auth.uid())
  );

CREATE POLICY "assignments_insert" ON task_assignments FOR INSERT TO authenticated
  WITH CHECK (
    is_admin_or_coordinador(auth.uid())
  );

CREATE POLICY "assignments_update" ON task_assignments FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR is_admin_or_coordinador(auth.uid())
  );

CREATE POLICY "assignments_delete" ON task_assignments FOR DELETE TO authenticated
  USING (
    is_admin_or_coordinador(auth.uid())
  );
