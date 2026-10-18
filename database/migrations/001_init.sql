-- SIAE-Modular — Esquema inicial
-- Basado en el modelo de datos definido en Sprint 2 (Expediente de Diseño Técnico)

CREATE TYPE user_role AS ENUM ('alumno', 'mentor', 'admin');
CREATE TYPE project_state AS ENUM ('borrador', 'pendiente', 'validado', 'registrado', 'correccion');

CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    codigo_cucei    VARCHAR(9) UNIQUE NOT NULL,
    nombre          VARCHAR(200) NOT NULL,
    password_hash   TEXT NOT NULL,
    rol             user_role NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE projects (
    id_proyecto     SERIAL PRIMARY KEY,
    titulo          VARCHAR(500) NOT NULL, -- validado en app: máx 20 palabras
    id_mentor       INTEGER REFERENCES users(id),
    estado_actual   project_state NOT NULL DEFAULT 'borrador',
    pdf_path        TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un alumno solo puede estar en un proyecto activo a la vez.
-- Tanto esa regla como el máximo de integrantes se aplican a nivel de
-- servicio, no por constraint: el límite vive en MAX_MEMBERS
-- (backend/src/services/teamRequest.service.ts). Nació en 3 y desde SM-40
-- son 5; se documenta aquí para que el esquema no contradiga al código.
CREATE TABLE project_members (
    id_proyecto     INTEGER NOT NULL REFERENCES projects(id_proyecto) ON DELETE CASCADE,
    codigo_alumno   VARCHAR(9) NOT NULL REFERENCES users(codigo_cucei),
    PRIMARY KEY (id_proyecto, codigo_alumno)
);

CREATE TABLE folios (
    id_folio        SERIAL PRIMARY KEY,
    codigo_folio    VARCHAR(20) UNIQUE NOT NULL, -- formato A###-26A
    fecha_emision   TIMESTAMPTZ NOT NULL DEFAULT now(),
    id_proyecto     INTEGER UNIQUE NOT NULL REFERENCES projects(id_proyecto)
);

CREATE TABLE state_logs (
    id_log              SERIAL PRIMARY KEY,
    id_proyecto         INTEGER NOT NULL REFERENCES projects(id_proyecto) ON DELETE CASCADE,
    estado_anterior     project_state,
    estado_nuevo        project_state NOT NULL,
    id_usuario_accion   INTEGER REFERENCES users(id),
    "timestamp"         TIMESTAMPTZ NOT NULL DEFAULT now(),
    comentario          TEXT
);

-- Secuencia para el contador incremental del folio (A###-26A)
CREATE SEQUENCE folio_counter_info START 1;

CREATE INDEX idx_projects_estado ON projects(estado_actual);
CREATE INDEX idx_projects_mentor ON projects(id_mentor);
CREATE INDEX idx_state_logs_proyecto ON state_logs(id_proyecto);
