# Guia de Ejecucion Local - MediaTracker

## Requisitos previos

- Node.js 18+ y npm
- Expo CLI (`npm install -g expo-cli`)
- Cuenta en Supabase (gratuita en https://supabase.com)
- Dispositivo Android o emulador Android
- Expo Go app instalada en tu dispositivo (opcional para desarrollo rapido)

---

## Paso 1: Clonar o preparar el proyecto

```bash
# Si clonas desde un repositorio
git clone <url-del-repo>
cd <nombre-del-proyecto>

# O si ya tienes la carpeta del proyecto
cd project
```

---

## Paso 2: Instalar dependencias

```bash
npm install
```

Esto instala todas las librerias necesarias:
- expo, expo-router, expo-status-bar
- @supabase/supabase-js
- react-native, react-native-safe-area-context
- lucide-react-native, @expo/vector-icons

---

## Paso 3: Configurar Supabase

### 3.1 Crear proyecto en Supabase

1. Ve a https://supabase.com y crea una cuenta (si no tienes)
2. Crea un nuevo proyecto
3. Espera a que se provisione (toma 1-2 minutos)

### 3.2 Obtener credenciales

1. En el dashboard de Supabase, ve a **Project Settings > API**
2. Copia estos valores:
   - **URL** (Project URL)
   - **anon public** (anon key)

### 3.3 Crear archivo .env

```bash
cp .env.example .env
```

O crea el archivo manualmente:

```bash
# .env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

Reemplaza los valores con los de tu proyecto Supabase.

---

## Paso 4: Configurar la base de datos en Supabase

### 4.1 Abrir SQL Editor

En el dashboard de Supabase:
1. Ve a **SQL Editor > New query**
2. Pega y ejecuta las siguientes migraciones

### 4.2 Ejecutar Migracion 1 - Tablas principales

```sql
-- Crear tablas para tracker de contenido compartido

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
  fecha_inicio date,
  fecha_fin date,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS media_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(media_id, user_id)
);

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  created_at timestamptz DEFAULT now()
);
```

### 4.3 Ejecutar Migracion 2 - Seguridad (RLS)

```sql
-- Habilitar Row Level Security
ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Perfiles: todos pueden ver, solo el propietario puede modificar
DROP POLICY IF EXISTS "select_profiles" ON profiles;
CREATE POLICY "select_profiles" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Media items: creador o partner puede acceder
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
  TO authenticated USING (created_by = auth.uid());

-- Media partners
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
```

### 4.4 Ejecutar Migracion 3 - Indices y triggers

```sql
-- Extension para busqueda de texto
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Indices para rendimiento
CREATE INDEX IF NOT EXISTS idx_media_tipo ON media_items(tipo);
CREATE INDEX IF NOT EXISTS idx_media_estado ON media_items(estado);
CREATE INDEX IF NOT EXISTS idx_media_plataforma ON media_items(plataforma);
CREATE INDEX IF NOT EXISTS idx_media_prioridad ON media_items(prioridad);
CREATE INDEX IF NOT EXISTS idx_media_created_by ON media_items(created_by);
CREATE INDEX IF NOT EXISTS idx_media_titulo_trgm ON media_items USING gin(titulo gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_media_partners_media_id ON media_partners(media_id);
CREATE INDEX IF NOT EXISTS idx_media_partners_user_id ON media_partners(user_id);

-- Trigger para actualizar updated_at automaticamente
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
```

### 4.5 Configurar autenticacion por email

En el dashboard de Supabase:
1. Ve a **Authentication > Providers**
2. Asegurate de que **Email** este habilitado
3. Desactiva **Confirm email** (para desarrollo local)
4. Ve a **Authentication > URL Configuration**
5. En **Site URL** pon: `http://localhost:8081`

---

## Paso 5: Iniciar la aplicacion

### Opcion A: Modo desarrollo con Expo (recomendado)

```bash
npm run dev
```

Esto inicia el bundler de Metro. Veras un codigo QR en la terminal.

- **Con Expo Go**: Escanea el QR con la app Expo Go en tu Android
- **Con emulador**: Presiona `a` en la terminal para abrir Android
- **Web**: Presiona `w` para abrir en navegador (http://localhost:8081)

### Opcion B: Solo web

```bash
npx expo start --web
```

### Opcion C: Build de produccion web

```bash
npm run build:web
```

Genera archivos estaticos en la carpeta `dist/`.

---

## Paso 6: Flujo de uso basico

### 6.1 Primer usuario

1. Abre la app
2. Ve a "Registrate"
3. Crea una cuenta con email, contrasena y nombre
4. Inicia sesion automaticamente
5. Ve al tab "Agregar" y crea tu primer contenido

### 6.2 Segundo usuario (para compartir)

1. En otro dispositivo o con otra cuenta de email
2. Repite el registro
3. El primer usuario puede compartir contenido:
   - Ve al detalle de un item
   - Toca "Compartir"
   - Busca el email del segundo usuario
   - Agregalo como partner

### 6.3 Verificar sincronizacion

- Ambos usuarios deben ver el contenido compartido en tiempo real
- Si un usuario edita, el otro ve el cambio instantaneamente
- La sincronizacion funciona mediante Supabase Realtime

---

## Paso 7: Solucion de problemas comunes

### Error: "No se pudo conectar a Supabase"
- Verifica que las variables en `.env` sean correctas
- Asegurate de que el proyecto Supabase este activo
- Verifica tu conexion a internet

### Error: "new row violates row-level security policy"
- Verifica que las politicas RLS esten creadas correctamente
- Asegurate de estar autenticado (tener sesion iniciada)

### Error: "Cannot find module"
- Ejecuta `npm install` nuevamente
- Borra `node_modules` y reinstala: `rm -rf node_modules && npm install`

### La app no se actualiza en tiempo real
- Verifica que el canal de Supabase Realtime este activo
- En el dashboard de Supabase, ve a **Database > Replication** y asegurate de que `media_items` y `media_partners` tengan replication habilitada

---

## Estructura de archivos clave

```
project/
  app/
    _layout.tsx              # Layout raiz con auth
    (auth)/
      _layout.tsx            # Layout auth
      login.tsx              # Pantalla login
      register.tsx           # Pantalla registro
    (tabs)/
      _layout.tsx            # Layout tabs
      index.tsx              # Home + filtros
      add.tsx                # Agregar contenido
      edit/
        [id].tsx             # Editar contenido
      detail/
        [id].tsx             # Detalle + compartir
      profile.tsx            # Perfil usuario
  components/
    MediaCard.tsx            # Tarjeta de contenido
  context/
    AuthContext.tsx          # Contexto autenticacion
  lib/
    supabase.ts              # Cliente Supabase
    auth.ts                  # Funciones auth
    media.ts                 # CRUD contenido
  types/
    index.ts                 # Tipos TypeScript
    supabase.ts              # Tipos base de datos
  constants/
    colors.ts                # Colores de la app
    data.ts                  # Datos estaticos
  .env                       # Variables de entorno
  app.json                   # Configuracion Expo
  package.json               # Dependencias
```

---

## Comandos utiles

| Comando | Descripcion |
|---------|-------------|
| `npm run dev` | Inicia servidor de desarrollo |
| `npm run build:web` | Build para produccion web |
| `npm run typecheck` | Verifica tipos TypeScript |
| `npx expo start --android` | Inicia solo para Android |
| `npx expo start --web` | Inicia solo para web |
| `npx expo doctor` | Diagnostica problemas de Expo |

---

## Tecnologias utilizadas

- **React Native + Expo**: Framework movil
- **TypeScript**: Tipado estatico
- **Supabase**: Backend (auth + base de datos + realtime)
- **Expo Router**: Navegacion
- **Lucide React Native**: Iconos

---

## Notas importantes

- La app esta configurada para **Android** como plataforma principal
- Para iOS se requiere macOS y Xcode (no compatible con este entorno)
- Los datos se sincronizan en tiempo real entre dispositivos gracias a Supabase Realtime
- La autenticacion es por email/contrasena (sin confirmacion de email para facilitar pruebas)
- Las imagenes y assets estan en `assets/images/`
