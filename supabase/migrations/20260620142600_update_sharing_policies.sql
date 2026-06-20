-- =========================================================================
-- 1. FUNCIÓN HELPER CON PRIVILEGIOS DE ADMINISTRADOR (SECURITY DEFINER)
-- =========================================================================
-- Esta función comprueba si un usuario es compañero de un contenido.
-- Al ejecutarse con SECURITY DEFINER, se ejecuta con privilegios elevados
-- evitando activar las políticas RLS recursivamente en media_partners.
CREATE OR REPLACE FUNCTION public.is_media_partner(media_id uuid, user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.media_partners
    WHERE media_id = $1 AND user_id = $2
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;


-- =========================================================================
-- 2. RECREAR POLÍTICAS RLS EN MEDIA_ITEMS
-- =========================================================================
DROP POLICY IF EXISTS "select_media" ON media_items;
CREATE POLICY "select_media" ON media_items FOR SELECT
  TO authenticated USING (
    created_by = auth.uid() OR
    public.is_media_partner(id, auth.uid())
  );

DROP POLICY IF EXISTS "update_media" ON media_items;
CREATE POLICY "update_media" ON media_items FOR UPDATE
  TO authenticated USING (
    created_by = auth.uid() OR
    public.is_media_partner(id, auth.uid())
  ) WITH CHECK (
    created_by = auth.uid() OR
    public.is_media_partner(id, auth.uid())
  );

DROP POLICY IF EXISTS "delete_media" ON media_items;
CREATE POLICY "delete_media" ON media_items FOR DELETE
  TO authenticated USING (
    created_by = auth.uid() OR
    public.is_media_partner(id, auth.uid())
  );


-- =========================================================================
-- 3. RECREAR POLÍTICAS RLS EN MEDIA_PARTNERS
-- =========================================================================
DROP POLICY IF EXISTS "select_partners" ON media_partners;
CREATE POLICY "select_partners" ON media_partners FOR SELECT
  TO authenticated USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM media_items mi 
      WHERE mi.id = media_partners.media_id 
      AND mi.created_by = auth.uid()
    ) OR
    public.is_media_partner(media_partners.media_id, auth.uid())
  );

DROP POLICY IF EXISTS "insert_partners" ON media_partners;
CREATE POLICY "insert_partners" ON media_partners FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM media_items mi 
      WHERE mi.id = media_partners.media_id 
      AND mi.created_by = auth.uid()
    ) OR
    public.is_media_partner(media_partners.media_id, auth.uid())
  );

DROP POLICY IF EXISTS "delete_partners" ON media_partners;
CREATE POLICY "delete_partners" ON media_partners FOR DELETE
  TO authenticated USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM media_items mi 
      WHERE mi.id = media_partners.media_id 
      AND mi.created_by = auth.uid()
    ) OR
    public.is_media_partner(media_partners.media_id, auth.uid())
  );


-- =========================================================================
-- 4. TRIGGER DE AUTO-CREACIÓN DE PERFILES
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      display_name = COALESCE(EXCLUDED.display_name, profiles.display_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sincronizar perfiles existentes
INSERT INTO public.profiles (id, email, display_name)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'display_name', split_part(email, '@', 1))
FROM auth.users
ON CONFLICT (id) DO NOTHING;
