-- ============================================================
-- HikCoach 2026 — Supabase Setup con autenticación segura
-- Ejecuta este script completo en SQL Editor de Supabase
-- ============================================================

-- 1. Crear tabla principal de datos
CREATE TABLE IF NOT EXISTS hikcoach_store (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Activar Row Level Security
ALTER TABLE hikcoach_store ENABLE ROW LEVEL SECURITY;

-- Borrar políticas anteriores si existen
DROP POLICY IF EXISTS "allow_all"          ON hikcoach_store;
DROP POLICY IF EXISTS "read_public"        ON hikcoach_store;
DROP POLICY IF EXISTS "write_own_prefix"   ON hikcoach_store;
DROP POLICY IF EXISTS "update_own_prefix"  ON hikcoach_store;
DROP POLICY IF EXISTS "no_delete"          ON hikcoach_store;
DROP POLICY IF EXISTS "participant_insert" ON hikcoach_store;
DROP POLICY IF EXISTS "participant_update" ON hikcoach_store;
DROP POLICY IF EXISTS "instructor_write"   ON hikcoach_store;
DROP POLICY IF EXISTS "instructor_update"  ON hikcoach_store;
DROP POLICY IF EXISTS "instructor_delete"  ON hikcoach_store;
DROP POLICY IF EXISTS "public_read"        ON hikcoach_store;

-- 3. LECTURA: cualquiera puede leer (participantes ven su progreso)
CREATE POLICY "public_read" ON hikcoach_store
  FOR SELECT USING (true);

-- 4. ESCRITURA participantes: solo pueden escribir claves de progreso
--    NO pueden tocar claves de notas (hkc4-grade-*) ni locks (hkc4-examlock-*)
--    Formato claves: hkc4-CURSO-NOMBRE-actividad
CREATE POLICY "participant_insert" ON hikcoach_store
  FOR INSERT WITH CHECK (
    key LIKE 'hkc4-%'
    AND key NOT LIKE 'hkc4-grade-%'
    AND key NOT LIKE 'hkc4-examlock-%'
  );

CREATE POLICY "participant_update" ON hikcoach_store
  FOR UPDATE
  USING (
    key LIKE 'hkc4-%'
    AND key NOT LIKE 'hkc4-grade-%'
    AND key NOT LIKE 'hkc4-examlock-%'
  )
  WITH CHECK (
    key LIKE 'hkc4-%'
    AND key NOT LIKE 'hkc4-grade-%'
    AND key NOT LIKE 'hkc4-examlock-%'
  );

-- 5. NOTAS y LOCK: solo instructores autenticados pueden escribir
--    Formato notas: hkc4-grade-CURSO-NOMBRE
--    Formato lock:  hkc4-examlock-CURSO
CREATE POLICY "instructor_write" ON hikcoach_store
  FOR INSERT WITH CHECK (
    (key LIKE 'hkc4-grade-%' OR key LIKE 'hkc4-examlock-%')
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "instructor_update" ON hikcoach_store
  FOR UPDATE
  USING (
    (key LIKE 'hkc4-grade-%' OR key LIKE 'hkc4-examlock-%')
    AND auth.role() = 'authenticated'
  )
  WITH CHECK (
    (key LIKE 'hkc4-grade-%' OR key LIKE 'hkc4-examlock-%')
    AND auth.role() = 'authenticated'
  );

-- 6. BORRAR: solo instructores autenticados
CREATE POLICY "instructor_delete" ON hikcoach_store
  FOR DELETE USING (auth.role() = 'authenticated');


-- ============================================================
-- IMPORTANTE: Después de ejecutar este SQL, crea el instructor
-- en Supabase: Authentication → Users → Add user
-- Email:    instructor@hikcoach.local   (no se usa para login)
-- Password: (la contraseña segura que elijas)
-- ============================================================
