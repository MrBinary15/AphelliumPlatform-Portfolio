-- ============================================================
-- MIGRACIÓN: Crear tabla 'proyectos' para Aphellium Platform
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Crear tabla
CREATE TABLE IF NOT EXISTS public.proyectos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT,
  excerpt TEXT,
  description TEXT,
  category TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('planning', 'active', 'completed', 'paused')),
  img_url TEXT,
  client_name TEXT,
  location TEXT,
  start_date DATE,
  end_date DATE,
  metrics JSONB DEFAULT '[]'::jsonb,
  gallery TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  featured BOOLEAN DEFAULT false,
  title_es TEXT,
  title_en TEXT,
  excerpt_es TEXT,
  excerpt_en TEXT,
  description_es TEXT,
  description_en TEXT,
  category_es TEXT,
  category_en TEXT,
  author_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitar Row Level Security
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;

-- 3. Política: lectura pública
CREATE POLICY "Public read access" ON public.proyectos
  FOR SELECT USING (true);

-- 4. Política: usuarios autenticados pueden gestionar
CREATE POLICY "Authenticated users can manage" ON public.proyectos
  FOR ALL USING (auth.role() = 'authenticated');

-- 5. Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_proyectos_status ON public.proyectos(status);
CREATE INDEX IF NOT EXISTS idx_proyectos_category ON public.proyectos(category);
CREATE INDEX IF NOT EXISTS idx_proyectos_featured ON public.proyectos(featured);
CREATE INDEX IF NOT EXISTS idx_proyectos_created_at ON public.proyectos(created_at DESC);

-- 6. Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_proyectos_updated_at ON public.proyectos;
CREATE TRIGGER set_proyectos_updated_at
  BEFORE UPDATE ON public.proyectos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Crear bucket de storage para imágenes de proyectos (opcional)
INSERT INTO storage.buckets (id, name, public)
VALUES ('proyectos', 'proyectos', true)
ON CONFLICT (id) DO NOTHING;

-- 8. Política de storage: upload para autenticados
CREATE POLICY "Authenticated upload proyectos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'proyectos' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Public read proyectos storage" ON storage.objects
  FOR SELECT USING (bucket_id = 'proyectos');

CREATE POLICY "Authenticated delete proyectos storage" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'proyectos' AND auth.role() = 'authenticated'
  );
