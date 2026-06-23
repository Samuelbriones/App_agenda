-- 1. Tabla de relaciones entre usuarios
CREATE TABLE IF NOT EXISTS public.user_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  relationship_type text NOT NULL CHECK (relationship_type IN ('friend', 'partner')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(sender_id, receiver_id),
  CONSTRAINT no_self_relationship CHECK (sender_id != receiver_id)
);

-- Habilitar RLS
ALTER TABLE public.user_relationships ENABLE ROW LEVEL SECURITY;

-- 2. Políticas de Seguridad (RLS)

-- SELECT: Los usuarios pueden ver relaciones en las que participan
DROP POLICY IF EXISTS "select_relationships" ON public.user_relationships;
CREATE POLICY "select_relationships" ON public.user_relationships FOR SELECT
  TO authenticated USING (
    sender_id = auth.uid() OR receiver_id = auth.uid()
  );

-- INSERT: Un usuario puede enviar una solicitud si es el remitente (sender_id)
DROP POLICY IF EXISTS "insert_relationships" ON public.user_relationships;
CREATE POLICY "insert_relationships" ON public.user_relationships FOR INSERT
  TO authenticated WITH CHECK (
    sender_id = auth.uid()
  );

-- UPDATE: El receptor (receiver_id) puede aceptar/rechazar la solicitud; el remitente puede cambiarla si es necesario
DROP POLICY IF EXISTS "update_relationships" ON public.user_relationships;
CREATE POLICY "update_relationships" ON public.user_relationships FOR UPDATE
  TO authenticated USING (
    sender_id = auth.uid() OR receiver_id = auth.uid()
  ) WITH CHECK (
    sender_id = auth.uid() OR receiver_id = auth.uid()
  );

-- DELETE: Cualquier miembro de la relación puede eliminarla (desvincularse)
DROP POLICY IF EXISTS "delete_relationships" ON public.user_relationships;
CREATE POLICY "delete_relationships" ON public.user_relationships FOR DELETE
  TO authenticated USING (
    sender_id = auth.uid() OR receiver_id = auth.uid()
  );

-- =========================================================================
-- 3. TRIGGER PARA LIMPIAR MEDIA_PARTNERS AL ELIMINAR RELACIÓN
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_deleted_relationship()
RETURNS trigger AS $$
BEGIN
  -- Eliminar contenidos compartidos creados por sender_id y compartidos con receiver_id
  DELETE FROM public.media_partners mp
  WHERE mp.user_id = OLD.receiver_id
  AND EXISTS (
    SELECT 1 FROM public.media_items mi
    WHERE mi.id = mp.media_id
    AND mi.created_by = OLD.sender_id
  );

  -- Eliminar contenidos compartidos creados por receiver_id y compartidos con sender_id
  DELETE FROM public.media_partners mp
  WHERE mp.user_id = OLD.sender_id
  AND EXISTS (
    SELECT 1 FROM public.media_items mi
    WHERE mi.id = mp.media_id
    AND mi.created_by = OLD.receiver_id
  );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_relationship_deleted ON public.user_relationships;
CREATE TRIGGER on_relationship_deleted
  AFTER DELETE ON public.user_relationships
  FOR EACH ROW EXECUTE FUNCTION public.handle_deleted_relationship();

