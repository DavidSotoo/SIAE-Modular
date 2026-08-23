-- SIAE-Modular — Seed: Catálogos de Skills y Áreas de Interés
-- Ejecutar DESPUÉS de 002_team_matching.sql

-- ─────────────────────────────────────────────────────────────
-- Skills: Hard Skills técnicas de Ingeniería en Informática
-- ─────────────────────────────────────────────────────────────
INSERT INTO skills (nombre, tipo) VALUES
    ('JavaScript',              'hard'),
    ('Python',                  'hard'),
    ('React',                   'hard'),
    ('Node.js',                 'hard'),
    ('PostgreSQL',              'hard'),
    ('Docker',                  'hard'),
    -- Soft Skills
    ('Liderazgo',               'soft'),
    ('Comunicación efectiva',   'soft'),
    ('Gestión del tiempo',      'soft'),
    ('Trabajo en equipo',       'soft'),
    ('Resolución de conflictos','soft'),
    ('Pensamiento crítico',     'soft')
ON CONFLICT (nombre) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- Áreas de Interés: 8 áreas del reglamento de servicio social UdG
-- ─────────────────────────────────────────────────────────────
INSERT INTO areas_interes (nombre) VALUES
    ('Ambiente'),
    ('Conocimiento del Universo'),
    ('Educación'),
    ('Desarrollo Sustentable'),
    ('Desarrollo Tecnológico'),
    ('Energía'),
    ('Salud'),
    ('Sociedad')
ON CONFLICT (nombre) DO NOTHING;
