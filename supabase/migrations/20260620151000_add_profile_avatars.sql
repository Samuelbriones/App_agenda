-- 1. Agregar columna de avatar a la tabla de perfiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Crear el bucket público 'avatars' para guardar los archivos
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Habilitar políticas RLS para que los usuarios gestionen sus fotos
DROP POLICY IF EXISTS "Permitir subida de avatares a autenticados" ON storage.objects;
CREATE POLICY "Permitir subida de avatares a autenticados"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Permitir lectura pública de avatares" ON storage.objects;
CREATE POLICY "Permitir lectura pública de avatares"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Permitir actualización de avatares propios" ON storage.objects;
CREATE POLICY "Permitir actualización de avatares propios"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Permitir eliminación de avatares propios" ON storage.objects;
CREATE POLICY "Permitir eliminación de avatares propios"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
