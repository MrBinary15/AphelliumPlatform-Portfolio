-- =============================================
-- MIGRACIÓN: Sistema de Soporte Público + Knowledge Base para IA
-- Ejecutar en Supabase Dashboard > SQL Editor
-- =============================================

-- 1. Tabla de documentos de conocimiento para entrenar la IA
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  category    TEXT DEFAULT 'general',
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden gestionar documentos de conocimiento
DROP POLICY IF EXISTS "knowledge_docs_admin_select" ON public.knowledge_documents;
CREATE POLICY "knowledge_docs_admin_select"
  ON public.knowledge_documents FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "knowledge_docs_admin_insert" ON public.knowledge_documents;
CREATE POLICY "knowledge_docs_admin_insert"
  ON public.knowledge_documents FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "knowledge_docs_admin_update" ON public.knowledge_documents;
CREATE POLICY "knowledge_docs_admin_update"
  ON public.knowledge_documents FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "knowledge_docs_admin_delete" ON public.knowledge_documents;
CREATE POLICY "knowledge_docs_admin_delete"
  ON public.knowledge_documents FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Lectura pública para la API de Gemini (usando service role, no anon)
-- El acceso anon es denegado por defecto, la API route usa service role.

-- 2. Tabla de conversaciones de soporte (visitantes -> equipo)
CREATE TABLE IF NOT EXISTS public.support_conversations (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id    TEXT NOT NULL,
  visitor_name  TEXT DEFAULT 'Visitante',
  status        TEXT DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'closed')),
  assigned_to   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  escalated_from_ai BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_support_conv_visitor
  ON public.support_conversations (visitor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_conv_status
  ON public.support_conversations (status);

ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;

-- Solo staff autenticado puede ver conversaciones de soporte
DROP POLICY IF EXISTS "support_conv_staff_select" ON public.support_conversations;
CREATE POLICY "support_conv_staff_select"
  ON public.support_conversations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'coordinador', 'editor'))
  );

DROP POLICY IF EXISTS "support_conv_staff_update" ON public.support_conversations;
CREATE POLICY "support_conv_staff_update"
  ON public.support_conversations FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'coordinador'))
  );

-- 3. Tabla de mensajes de soporte
CREATE TABLE IF NOT EXISTS public.support_messages (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id   UUID NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender_type       TEXT NOT NULL CHECK (sender_type IN ('visitor', 'agent', 'ai', 'system')),
  sender_id         TEXT,
  content           TEXT NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_support_msg_conversation
  ON public.support_messages (conversation_id, created_at ASC);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Staff puede leer mensajes de soporte
DROP POLICY IF EXISTS "support_msg_staff_select" ON public.support_messages;
CREATE POLICY "support_msg_staff_select"
  ON public.support_messages FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'coordinador', 'editor'))
  );

-- Staff puede insertar mensajes (respuestas)
DROP POLICY IF EXISTS "support_msg_staff_insert" ON public.support_messages;
CREATE POLICY "support_msg_staff_insert"
  ON public.support_messages FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'coordinador', 'editor'))
  );

-- 4. Habilitar Realtime para mensajes de soporte
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'support_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'support_conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_conversations;
  END IF;
END $$;

-- =============================================
-- VERIFICACIÓN
-- =============================================
-- SELECT * FROM public.knowledge_documents LIMIT 1;
-- SELECT * FROM public.support_conversations LIMIT 1;
-- SELECT * FROM public.support_messages LIMIT 1;
