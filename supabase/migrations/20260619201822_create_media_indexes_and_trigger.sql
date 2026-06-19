/*
# Crear indices y trigger para media_items

1. Changes
- Add indexes on frequently queried columns: tipo, estado, plataforma, prioridad, created_by
- Add full-text search index on titulo using pg_trgm
- Add updated_at trigger to auto-update timestamp
- Ensure pg_trgm extension is available

2. Security
- No security changes, only performance improvements
*/

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_media_tipo ON media_items(tipo);
CREATE INDEX IF NOT EXISTS idx_media_estado ON media_items(estado);
CREATE INDEX IF NOT EXISTS idx_media_plataforma ON media_items(plataforma);
CREATE INDEX IF NOT EXISTS idx_media_prioridad ON media_items(prioridad);
CREATE INDEX IF NOT EXISTS idx_media_created_by ON media_items(created_by);
CREATE INDEX IF NOT EXISTS idx_media_titulo_trgm ON media_items USING gin(titulo gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_media_partners_media_id ON media_partners(media_id);
CREATE INDEX IF NOT EXISTS idx_media_partners_user_id ON media_partners(user_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_media_items_updated_at ON media_items;
CREATE TRIGGER update_media_items_updated_at
  BEFORE UPDATE ON media_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
