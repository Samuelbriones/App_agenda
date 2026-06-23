-- 1. Tabla de votos (swipes)
CREATE TABLE IF NOT EXISTS public.movie_swipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
  vote boolean NOT NULL, -- true = Like, false = Dislike
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, media_id)
);

-- Habilitar RLS
ALTER TABLE public.movie_swipes ENABLE ROW LEVEL SECURITY;

-- 2. Políticas de Seguridad (RLS)

-- SELECT: Un usuario puede ver sus propios votos, o los votos de los contenidos compartidos con él
DROP POLICY IF EXISTS "select_swipes" ON public.movie_swipes;
CREATE POLICY "select_swipes" ON public.movie_swipes FOR SELECT
  TO authenticated USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.media_partners mp
      WHERE mp.media_id = movie_swipes.media_id AND mp.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.media_items mi
      WHERE mi.id = movie_swipes.media_id AND mi.created_by = auth.uid()
    )
  );

-- INSERT: Solo puedes votar por ti mismo
DROP POLICY IF EXISTS "insert_swipes" ON public.movie_swipes;
CREATE POLICY "insert_swipes" ON public.movie_swipes FOR INSERT
  TO authenticated WITH CHECK (
    user_id = auth.uid()
  );

-- DELETE: Solo puedes eliminar tus propios votos
DROP POLICY IF EXISTS "delete_swipes" ON public.movie_swipes;
CREATE POLICY "delete_swipes" ON public.movie_swipes FOR DELETE
  TO authenticated USING (
    user_id = auth.uid()
  );

-- Crear índices para acelerar la comprobación de matches y swipes pendientes
CREATE INDEX IF NOT EXISTS idx_movie_swipes_user_id ON public.movie_swipes(user_id);
CREATE INDEX IF NOT EXISTS idx_movie_swipes_media_id ON public.movie_swipes(media_id);
CREATE INDEX IF NOT EXISTS idx_movie_swipes_user_media ON public.movie_swipes(user_id, media_id);
