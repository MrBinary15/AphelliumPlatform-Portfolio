-- =============================================
-- MIGRACIÓN: Sistema de Chat Interno del Equipo
-- Ejecutar en Supabase Dashboard > SQL Editor
-- =============================================

-- 1. Tabla de mensajes de chat interno
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  read_at     TIMESTAMPTZ
);

-- 2. Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
  ON public.chat_messages (sender_id, receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_unread
  ON public.chat_messages (receiver_id)
  WHERE read_at IS NULL;

-- 3. Row Level Security
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden ver mensajes que enviaron o recibieron
CREATE POLICY "chat_select_own"
  ON public.chat_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Los usuarios solo pueden enviar mensajes como ellos mismos
CREATE POLICY "chat_insert_own"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Solo el receptor puede marcar mensajes como leídos
CREATE POLICY "chat_update_receiver"
  ON public.chat_messages FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- 4. Habilitar Realtime para recibir mensajes en vivo
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- =============================================
-- VERIFICACIÓN: ejecutar después para confirmar
-- =============================================
-- SELECT * FROM public.chat_messages LIMIT 1;
-- SELECT * FROM pg_publication_tables WHERE tablename = 'chat_messages';
