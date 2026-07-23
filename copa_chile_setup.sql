-- ============================================================
-- Copa HIK Chile — Torneo de Instaladores
-- Setup de Base de Datos (Supabase)
-- Ejecuta este script completo en SQL Editor de Supabase
-- ============================================================

-- ============================================================
-- 1. TABLA: copa_grupos (7 grupos competidores)
-- ============================================================
CREATE TABLE IF NOT EXISTS copa_grupos (
  id          SERIAL PRIMARY KEY,
  nombre      TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. TABLA: copa_usuarios (evaluadores y super admin)
-- ============================================================
CREATE TABLE IF NOT EXISTS copa_usuarios (
  id          SERIAL PRIMARY KEY,
  nombre      TEXT NOT NULL,
  rol         TEXT NOT NULL CHECK (rol IN ('evaluador', 'superadmin')),
  password    TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. TABLA: copa_fases (4 fases de competencia)
-- ============================================================
CREATE TABLE IF NOT EXISTS copa_fases (
  id              SERIAL PRIMARY KEY,
  nombre          TEXT NOT NULL,
  orden           INT NOT NULL UNIQUE,
  activa          BOOLEAN DEFAULT false,
  bloqueada       BOOLEAN DEFAULT false,
  timer_minutos   INT DEFAULT 45,
  timer_inicio    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. TABLA: copa_tareas (5 tareas por fase)
-- ============================================================
CREATE TABLE IF NOT EXISTS copa_tareas (
  id                  SERIAL PRIMARY KEY,
  fase_id             INT NOT NULL REFERENCES copa_fases(id) ON DELETE CASCADE,
  orden               INT NOT NULL,
  titulo              TEXT NOT NULL,
  descripcion         TEXT NOT NULL,
  puntos_max          NUMERIC(4,1) DEFAULT 2.0,
  limite_caracteres   INT DEFAULT 500,
  created_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(fase_id, orden)
);

-- ============================================================
-- 5. TABLA: copa_progreso_grupo (autoevaluacion del grupo)
--    Lo que el grupo marca como completado (NO cuenta para nota)
-- ============================================================
CREATE TABLE IF NOT EXISTS copa_progreso_grupo (
  id          SERIAL PRIMARY KEY,
  grupo_id    INT NOT NULL REFERENCES copa_grupos(id) ON DELETE CASCADE,
  tarea_id    INT NOT NULL REFERENCES copa_tareas(id) ON DELETE CASCADE,
  completado  BOOLEAN DEFAULT false,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(grupo_id, tarea_id)
);

-- ============================================================
-- 6. TABLA: copa_calificaciones (notas del evaluador)
--    Esta es la calificacion que CUENTA
-- ============================================================
CREATE TABLE IF NOT EXISTS copa_calificaciones (
  id                SERIAL PRIMARY KEY,
  grupo_id          INT NOT NULL REFERENCES copa_grupos(id) ON DELETE CASCADE,
  tarea_id          INT NOT NULL REFERENCES copa_tareas(id) ON DELETE CASCADE,
  fase_id           INT NOT NULL REFERENCES copa_fases(id) ON DELETE CASCADE,
  puntos            NUMERIC(4,1) NOT NULL,
  evaluador_id      INT REFERENCES copa_usuarios(id),
  evaluador_nombre  TEXT,
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(grupo_id, tarea_id)
);

-- ============================================================
-- 7. TABLA: copa_config (configuraciones globales)
--    Almacena estados del timer, fase activa, etc.
-- ============================================================
CREATE TABLE IF NOT EXISTS copa_config (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- ROW LEVEL SECURITY
-- Politicas permisivas: la autenticacion se maneja en la app
-- ============================================================

ALTER TABLE copa_grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE copa_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE copa_fases ENABLE ROW LEVEL SECURITY;
ALTER TABLE copa_tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE copa_progreso_grupo ENABLE ROW LEVEL SECURITY;
ALTER TABLE copa_calificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE copa_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "copa_grupos_all" ON copa_grupos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "copa_usuarios_all" ON copa_usuarios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "copa_fases_all" ON copa_fases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "copa_tareas_all" ON copa_tareas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "copa_progreso_all" ON copa_progreso_grupo FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "copa_calificaciones_all" ON copa_calificaciones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "copa_config_all" ON copa_config FOR ALL USING (true) WITH CHECK (true);


-- ============================================================
-- DATOS INICIALES: Grupos
-- (Cambia las contraseñas segun lo que necesites)
-- ============================================================
INSERT INTO copa_grupos (nombre, password) VALUES
  ('Grupo 1', '12345678'),
  ('Grupo 2', '23456789'),
  ('Grupo 3', '34567890'),
  ('Grupo 4', '45678901'),
  ('Grupo 5', '56789012'),
  ('Grupo 6', '67890123'),
  ('Grupo 7', '78901234');


-- ============================================================
-- DATOS INICIALES: Usuarios (evaluadores + super admin)
-- (Cambia las contraseñas segun lo que necesites)
-- ============================================================
INSERT INTO copa_usuarios (nombre, rol, password) VALUES
  ('Ferney Beltran',     'superadmin',  'admin2026'),
  ('Alejandro Cholo',    'evaluador',   'eval2026'),
  ('Santiago Amarante',  'evaluador',   'eval2026'),
  ('Evaluador 4',        'evaluador',   'eval2026');


-- ============================================================
-- DATOS INICIALES: 4 Fases
-- ============================================================
INSERT INTO copa_fases (nombre, orden, timer_minutos) VALUES
  ('CCTV',               1, 30),
  ('Alarmas',            2, 30),
  ('Control de Acceso',  3, 30),
  ('Videoporteros',      4, 30);


-- ============================================================
-- DATOS INICIALES: Tareas Fase 1 — CCTV
-- Puntaje: 5 tareas x 2 pts = 10 pts total
-- ============================================================
INSERT INTO copa_tareas (fase_id, orden, titulo, descripcion, puntos_max) VALUES
(
  (SELECT id FROM copa_fases WHERE orden = 1), 1,
  'Instalacion, visualizacion y nombramiento de camaras',
  'Instalen una camara analogica y una camara IP asegurandose de que esten libres de golpes, rayones o danos fisicos. Elijan una posicion con buen angulo y minima cantidad de puntos ciegos. Verifiquen que ambas camaras esten correctamente conectadas y visibles desde el DVR. Asignen un nombre a cada camara que refleje la zona supervisada.',
  2.0
),
(
  (SELECT id FROM copa_fases WHERE orden = 1), 2,
  'Cruce de linea con luz estroboscopica',
  'Configuren una regla de cruce de linea sobre el canal de la camara analogica. El evento debe activarse unicamente ante el cruce de personas. Definan un horario de oficina para que el evento este activo solo dentro de ese rango. Asegurense de que el sentido de deteccion sea de A hacia B. Al detectar el cruce, debe activarse la luz estroboscopica de la camara.',
  2.0
),
(
  (SELECT id FROM copa_fases WHERE orden = 1), 3,
  'Area de intrusion con buzzer por vehiculos',
  'Establezcan un area de deteccion de intrusion en el canal correspondiente. El area debe estar activa en un rango 24x7. Configuren el tipo de objetivo a detectar como vehiculos unicamente. Al generarse la intrusion, el sistema debe activar el buzzer del DVR.',
  2.0
),
(
  (SELECT id FROM copa_fases WHERE orden = 1), 4,
  'Agregacion del DVR a Hik-Connect',
  'Asocien correctamente el DVR a una cuenta valida en la app Hik-Connect. Confirmen que la visualizacion de camaras sea estable y en tiempo real desde un dispositivo movil.',
  2.0
),
(
  (SELECT id FROM copa_fases WHERE orden = 1), 5,
  'Prueba completa en Hik-Connect',
  'Verifiquen la visualizacion de la camara analogica y la IP desde Hik-Connect. Habiliten y prueben el audio bidireccional asegurando que se pueda hablar y escuchar desde la app mediante la camara analogica. Confirmen que se reciben notificaciones push ante los eventos previamente configurados.',
  2.0
);


-- ============================================================
-- DATOS INICIALES: Tareas Fase 2 — Alarmas
-- ============================================================
INSERT INTO copa_tareas (fase_id, orden, titulo, descripcion, puntos_max) VALUES
(
  (SELECT id FROM copa_fases WHERE orden = 2), 1,
  'Instalacion fisica del panel y perifericos',
  'Instalen el panel AXPro y los perifericos (sensores, teclado, reles) sin danos fisicos ni marcas visibles. Ubiquenlos en posiciones recomendadas por el fabricante, considerando cobertura, altura y distancia entre dispositivos.',
  2.0
),
(
  (SELECT id FROM copa_fases WHERE orden = 2), 2,
  'Configuracion de particiones, perifericos y tipo de zona',
  'Creen 2 particiones en el sistema. Agreguen y asignen 2 sensores magneticos, 2 sensores PIR, 1 teclado y 2 reles (distribuidos entre las particiones). Configuren el tipo de zona correcto segun el periferico. Asegurense de que los PIR esten deshabilitados al armar el sistema en modo casa.',
  2.0
),
(
  (SELECT id FROM copa_fases WHERE orden = 2), 3,
  'Automatizacion con rele desde la aplicacion',
  'Configuren uno de los reles como salida de automatizacion. Verifiquen que desde la app puedan encender y apagar este rele correctamente.',
  2.0
),
(
  (SELECT id FROM copa_fases WHERE orden = 2), 4,
  'Activacion de luz piloto por evento de alarma',
  'Conecten una luz piloto a la salida de alarma mediante el segundo rele. Configuren el rele para que se active exclusivamente al detectar un evento de intrusion con el sistema armado totalmente. La luz debe encenderse automaticamente en ese caso.',
  2.0
),
(
  (SELECT id FROM copa_fases WHERE orden = 2), 5,
  'Integracion con Hik-Connect y videoverificacion',
  'Agreguen el panel a Hik-Connect con una cuenta valida. Enlacen al menos un sensor con una camara IP del sistema. Verifiquen que al producirse una alarma: se reciba una notificacion push y al abrirla se reproduzca un video asociado al evento (videoverificacion).',
  2.0
);


-- ============================================================
-- DATOS INICIALES: Tareas Fase 3 — Control de Acceso
-- ============================================================
INSERT INTO copa_tareas (fase_id, orden, titulo, descripcion, puntos_max) VALUES
(
  (SELECT id FROM copa_fases WHERE orden = 3), 1,
  'Instalacion del terminal de control de acceso',
  'Instalen la terminal en condiciones optimas, sin danos fisicos visibles. Asegurense de fijarla a la altura recomendada por el fabricante. Conecten de forma correcta la luz piloto y el boton de salida, ambos directamente a la terminal.',
  2.0
),
(
  (SELECT id FROM copa_fases WHERE orden = 3), 2,
  'Configuracion de usuarios y niveles de acceso en Hik-Connect Teams',
  'Agreguen el dispositivo a Hik-Connect Teams. Creen 2 usuarios permanentes con reconocimiento facial y tarjeta. Generen 2 niveles de acceso con sus respectivos horarios: uno con horario de oficina y uno con horario 24x7. Asignen correctamente cada usuario a su nivel.',
  2.0
),
(
  (SELECT id FROM copa_fases WHERE orden = 3), 3,
  'Creacion de usuario temporal con codigo QR',
  'Creen un usuario temporal con acceso mediante codigo QR valido y funcional. Verifiquen que el usuario solo pueda acceder dentro del horario autorizado y que el sistema rechace el acceso fuera de ese rango.',
  2.0
),
(
  (SELECT id FROM copa_fases WHERE orden = 3), 4,
  'Validacion de usuarios y autenticacion',
  'Demuestren el acceso del usuario temporal mediante codigo QR. Demuestren el acceso de los usuarios permanentes utilizando doble autenticacion: rostro y tarjeta.',
  2.0
),
(
  (SELECT id FROM copa_fases WHERE orden = 3), 5,
  'Control de apertura con luz piloto y boton de salida',
  'Configuren la luz piloto para que se apague durante 7 segundos despues de una validacion correcta. La luz tambien debe apagarse al presionar el boton de salida.',
  2.0
);


-- ============================================================
-- DATOS INICIALES: Tareas Fase 4 — Videoporteros
-- ============================================================
INSERT INTO copa_tareas (fase_id, orden, titulo, descripcion, puntos_max) VALUES
(
  (SELECT id FROM copa_fases WHERE orden = 4), 1,
  'Instalacion del frente de calle y estacion interior',
  'Instalen correctamente el frente de calle y el monitor interior, sin golpes, rayones ni danos visibles. Asegurense de que el frente de calle este ubicado con buena visibilidad hacia el punto de acceso. Conecten una luz piloto a la salida de rele del frente de calle simulando el funcionamiento de una cerradura electrica.',
  2.0
),
(
  (SELECT id FROM copa_fases WHERE orden = 4), 2,
  'Comunicacion funcional y control desde Hik-Connect',
  'Configuren correctamente la red IP en ambos dispositivos. Asegurense de que el frente de calle este agregado a la estacion interior. Verifiquen que las llamadas funcionen correctamente tanto en local como desde la aplicacion Hik-Connect. Al ejecutar la apertura de puerta desde el monitor o desde la app, la luz piloto debe apagarse.',
  2.0
),
(
  (SELECT id FROM copa_fases WHERE orden = 4), 3,
  'Visualizacion de camaras externas en la estacion interior',
  'Agreguen al sistema una camara analogica y una camara IP. Asegurense de que ambas camaras puedan visualizarse en tiempo real desde la estacion interior. Verifiquen calidad y estabilidad de imagen.',
  2.0
),
(
  (SELECT id FROM copa_fases WHERE orden = 4), 4,
  'Sensor magnetico con armado y notificacion de evento',
  'Conecten un sensor magnetico directamente al monitor interior. Configurenlo como sensor de retardo. Armen el sistema y provoquen la apertura del sensor para generar un evento. Verifiquen que se reciba una notificacion de alarma en Hik-Connect.',
  2.0
),
(
  (SELECT id FROM copa_fases WHERE orden = 4), 5,
  'Subestacion con terminal de control de acceso',
  'Configuren una terminal de control de acceso como subestacion del frente de calle principal. Verifiquen que la estacion interior reciba llamadas tanto del frente de calle principal como de la subestacion. Ambas llamadas deben mostrar audio y video correctamente.',
  2.0
);


-- ============================================================
-- CONFIG INICIAL
-- ============================================================
INSERT INTO copa_config (key, value) VALUES
  ('fase_activa', '0'),
  ('evento_nombre', 'COPA HIK - Torneo de Instaladores'),
  ('evento_estado', 'pendiente');


-- ============================================================
-- FIN DEL SETUP
-- ============================================================
-- Despues de ejecutar:
-- 1. Verifica que las tablas se crearon en Table Editor
-- 2. Cambia las contraseñas de grupos y evaluadores si lo necesitas
-- 3. Actualiza el nombre del "Evaluador 4" cuando lo confirmes
-- ============================================================
