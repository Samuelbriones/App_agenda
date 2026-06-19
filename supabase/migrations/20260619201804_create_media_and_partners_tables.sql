/*
# Crear tablas para tracker de contenido compartido

1. New Tables
- `media_items`: tabla principal para series, peliculas y anime
  - `id` (uuid, primary key)
  - `tipo` (text, not null) - Serie | Pelicula | Anime
  - `titulo` (text, not null)
  - `genero` (text)
  - `plataforma` (text)
  - `estado` (text, not null) - Pendiente | Viendo | Finalizado | Abandonado
  - `progreso` (text)
  - `prioridad` (text) - Alta | Media | Baja
  - `calificacion` (integer)
  - `fecha_inicio` (date)
  - `fecha_fin` (date)
  - `created_by` (uuid, references auth.users)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
- `media_partners`: tabla de vinculacion para compartir items entre usuarios
  - `id` (uuid, primary key)
  - `media_id` (uuid, references media_items)
  - `user_id` (uuid, references auth.users)
  - `created_at` (timestamptz)
- `profiles`: tabla de perfiles de usuario
  - `id` (uuid, primary key, references auth.users)
  - `email` (text)
  - `display_name` (text)
  - `created_at` (timestamptz)

2. Security
- Enable RLS on all tables.
- Policies for media_items: users can access items they created or that are shared with them.
- Policies for media_partners: users can manage their own partnerships.
- Policies for profiles: users can read all profiles, update only their own.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS media_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('Serie', 'Pelicula', 'Anime')),
  titulo text NOT NULL,
  genero text,
  plataforma text,
  estado text NOT NULL CHECK (estado IN ('Pendiente', 'Viendo', 'Finalizado', 'Abandonado')),
  progreso text,
  prioridad text CHECK (prioridad IN ('Alta', 'Media', 'Baja')),
  calificacion integer CHECK (calificacion >= 1 AND calificacion <= 10),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS media_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(media_id, user_id)
);

ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "select_profiles" ON profiles;
CREATE POLICY "select_profiles" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Media items policies: creator or partner can access
DROP POLICY IF EXISTS "select_media" ON media_items;
CREATE POLICY "select_media" ON media_items FOR SELECT
  TO authenticated USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM media_partners mp WHERE mp.media_id = media_items.id AND mp.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_media" ON media_items;
CREATE POLICY "insert_media" ON media_items FOR INSERT
  TO authenticated WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "update_media" ON media_items;
CREATE POLICY "update_media" ON media_items FOR UPDATE
  TO authenticated USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM media_partners mp WHERE mp.media_id = media_items.id AND mp.user_id = auth.uid())
  ) WITH CHECK (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM media_partners mp WHERE mp.media_id = media_items.id AND mp.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_media" ON media_items;
CREATE POLICY "delete_media" ON media_items FOR DELETE
  TO authenticated USING (
    created_by = auth.uid()
  );

-- Media partners policies
DROP POLICY IF EXISTS "select_partners" ON media_partners;
CREATE POLICY "select_partners" ON media_partners FOR SELECT
  TO authenticated USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM media_items mi WHERE mi.id = media_partners.media_id AND mi.created_by = auth.uid())
  );

DROP POLICY IF EXISTS "insert_partners" ON media_partners;
CREATE POLICY "insert_partners" ON media_partners FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM media_items mi WHERE mi.id = media_partners.media_id AND mi.created_by = auth.uid())
  );

DROP POLICY IF EXISTS "delete_partners" ON media_partners;
CREATE POLICY "delete_partners" ON media_partners FOR DELETE
  TO authenticated USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM media_items mi WHERE mi.id = media_partners.media_id AND mi.created_by = auth.uid())
  );
