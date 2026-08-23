-- SIAE-Modular — Esquema Team Matching y Disponibilidad de Asesores
-- Ejecutar DESPUÉS de 001_init.sql

-- Ampliar el enum de estado de proyecto con 'cancelado'
ALTER TYPE project_state ADD VALUE IF NOT EXISTS 'cancelado';

-- ENUMs propios de este módulo
CREATE TYPE skill_tipo AS ENUM ('hard', 'soft');

CREATE TYPE nivel_skill AS ENUM ('basico', 'intermedio', 'avanzado');

CREATE TYPE disponibilidad_tipo AS ENUM (
    'tiempo_completo',
    'medio_tiempo',
    'fines_de_semana',
    'flexible'
);

CREATE TYPE estado_busqueda_tipo AS ENUM (
    'buscando_equipo',
    'en_equipo',
    'no_disponible'
);

CREATE TYPE team_request_estado AS ENUM (
    'pendiente',
    'aceptada',
    'rechazada',
    'cancelada'
);

CREATE TYPE advisor_request_estado AS ENUM (
    'pendiente',
    'aceptada',
    'rechazada',
    'cancelada'
);

-- Catálogos
CREATE TABLE skills (
    id_skill    SERIAL PRIMARY KEY,
    nombre      VARCHAR(100) UNIQUE NOT NULL,
    tipo        skill_tipo NOT NULL
);

CREATE TABLE areas_interes (
    id_area     SERIAL PRIMARY KEY,
    nombre      VARCHAR(200) UNIQUE NOT NULL
);

-- Perfil extendido del alumno (1:1 con users donde rol='alumno')
CREATE TABLE student_profiles (
    id_usuario          INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    semestre            SMALLINT CHECK (semestre BETWEEN 1 AND 12),
    bio                 TEXT,
    portafolio_url      VARCHAR(500),
    disponibilidad      disponibilidad_tipo,
    estado_busqueda     estado_busqueda_tipo NOT NULL DEFAULT 'buscando_equipo',
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Skills del alumno (muchos a muchos con nivel)
CREATE TABLE student_skills (
    id_usuario      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    id_skill        INTEGER NOT NULL REFERENCES skills(id_skill) ON DELETE CASCADE,
    nivel           nivel_skill NOT NULL DEFAULT 'basico',
    PRIMARY KEY (id_usuario, id_skill)
);

-- Áreas de interés del alumno
CREATE TABLE student_interests (
    id_usuario      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    id_area         INTEGER NOT NULL REFERENCES areas_interes(id_area) ON DELETE CASCADE,
    PRIMARY KEY (id_usuario, id_area)
);

-- Perfil de disponibilidad del asesor (1:1 con users donde rol='mentor')
CREATE TABLE advisor_profiles (
    id_usuario          INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    especialidad        VARCHAR(300),
    disponible          BOOLEAN NOT NULL DEFAULT true,
    cupo_maximo         SMALLINT NOT NULL DEFAULT 3 CHECK (cupo_maximo >= 0),
    acepta_coasesoria   BOOLEAN NOT NULL DEFAULT false,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Áreas en las que el asesor puede guiar proyectos
CREATE TABLE advisor_areas (
    id_usuario      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    id_area         INTEGER NOT NULL REFERENCES areas_interes(id_area) ON DELETE CASCADE,
    PRIMARY KEY (id_usuario, id_area)
);

-- Solicitudes de integración a equipo
CREATE TABLE team_requests (
    id_solicitud            SERIAL PRIMARY KEY,
    id_proyecto             INTEGER NOT NULL REFERENCES projects(id_proyecto) ON DELETE CASCADE,
    codigo_alumno_emisor    VARCHAR(9) NOT NULL REFERENCES users(codigo_cucei),
    codigo_alumno_receptor  VARCHAR(9) NOT NULL REFERENCES users(codigo_cucei),
    tipo                    VARCHAR(20) NOT NULL CHECK (tipo IN ('invitacion', 'solicitud')),
    mensaje                 TEXT,
    estado                  team_request_estado NOT NULL DEFAULT 'pendiente',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Solicitudes de asesoría
CREATE TABLE advisor_requests (
    id_solicitud    SERIAL PRIMARY KEY,
    id_proyecto     INTEGER NOT NULL REFERENCES projects(id_proyecto) ON DELETE CASCADE,
    id_mentor       INTEGER NOT NULL REFERENCES users(id),
    mensaje         TEXT,
    estado          advisor_request_estado NOT NULL DEFAULT 'pendiente',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de rendimiento
CREATE INDEX idx_student_profiles_estado   ON student_profiles(estado_busqueda);
CREATE INDEX idx_student_skills_usuario    ON student_skills(id_usuario);
CREATE INDEX idx_student_interests_usuario ON student_interests(id_usuario);
CREATE INDEX idx_advisor_profiles_disp     ON advisor_profiles(disponible);
CREATE INDEX idx_advisor_areas_usuario     ON advisor_areas(id_usuario);
CREATE INDEX idx_team_requests_proyecto    ON team_requests(id_proyecto);
CREATE INDEX idx_team_requests_emisor      ON team_requests(codigo_alumno_emisor);
CREATE INDEX idx_team_requests_receptor    ON team_requests(codigo_alumno_receptor);
CREATE INDEX idx_team_requests_estado      ON team_requests(estado);
CREATE INDEX idx_advisor_requests_proyecto ON advisor_requests(id_proyecto);
CREATE INDEX idx_advisor_requests_mentor   ON advisor_requests(id_mentor);
CREATE INDEX idx_advisor_requests_estado   ON advisor_requests(estado);

-- FIX 4: Garantiza que solo exista una solicitud 'pendiente' por (proyecto, receptor)
-- a nivel de base de datos, protegiendo contra race conditions concurrentes.
CREATE UNIQUE INDEX idx_team_requests_pendiente_unica
    ON team_requests(id_proyecto, codigo_alumno_receptor)
    WHERE estado = 'pendiente';
