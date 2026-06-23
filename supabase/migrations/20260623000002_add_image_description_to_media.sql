-- Agregar campos para imágenes, descripciones y vinculación con TMDB en media_items
ALTER TABLE public.media_items
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS tmdb_id text;
