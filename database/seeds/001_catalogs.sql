-- SIAE-Modular — Seed: Catálogos de Skills y Áreas de Interés
-- Ejecutar DESPUÉS de 002_team_matching.sql

-- ─────────────────────────────────────────────────────────────
-- Skills: Hard Skills técnicas de Ingeniería en Informática
-- ─────────────────────────────────────────────────────────────
INSERT INTO skills (nombre, tipo) VALUES
    -- Lenguajes de Programación (Hard Skills)
    ('JavaScript',              'hard'),
    ('TypeScript',              'hard'),
    ('Python',                  'hard'),
    ('Java',                    'hard'),
    ('C#',                      'hard'),
    ('C++',                     'hard'),
    ('PHP',                     'hard'),
    ('Ruby',                    'hard'),
    ('Go',                      'hard'),
    ('Rust',                    'hard'),
    ('Swift',                   'hard'),
    ('Kotlin',                  'hard'),
    ('SQL',                     'hard'),
    ('HTML',                    'hard'),
    ('CSS',                     'hard'),
    
    -- Frameworks y Librerías (Hard Skills)
    ('React',                   'hard'),
    ('Angular',                 'hard'),
    ('Vue.js',                  'hard'),
    ('Svelte',                  'hard'),
    ('Node.js',                 'hard'),
    ('Express',                 'hard'),
    ('NestJS',                  'hard'),
    ('Django',                  'hard'),
    ('Flask',                   'hard'),
    ('Spring Boot',             'hard'),
    ('.NET',                    'hard'),
    ('Laravel',                 'hard'),
    
    -- Bases de Datos (Hard Skills)
    ('PostgreSQL',              'hard'),
    ('MySQL',                   'hard'),
    ('MongoDB',                 'hard'),
    ('Redis',                   'hard'),
    ('Oracle',                  'hard'),
    ('SQL Server',              'hard'),
    ('Firebase',                'hard'),
    
    -- Infraestructura y DevOps (Hard Skills)
    ('Docker',                  'hard'),
    ('Kubernetes',              'hard'),
    ('AWS',                     'hard'),
    ('Google Cloud (GCP)',      'hard'),
    ('Microsoft Azure',         'hard'),
    ('Linux',                   'hard'),
    ('Git',                     'hard'),
    ('GitHub Actions',          'hard'),
    ('CI/CD',                   'hard'),
    ('Terraform',               'hard'),
    
    -- Otras Tecnologías (Hard Skills)
    ('GraphQL',                 'hard'),
    ('REST APIs',               'hard'),
    ('WebSockets',              'hard'),
    ('Machine Learning',        'hard'),
    ('Data Science',            'hard'),
    ('Ciberseguridad',          'hard'),
    ('Desarrollo Móvil',        'hard'),
    ('Unity',                   'hard'),

    -- Soft Skills
    ('Liderazgo',               'soft'),
    ('Comunicación efectiva',   'soft'),
    ('Gestión del tiempo',      'soft'),
    ('Trabajo en equipo',       'soft'),
    ('Resolución de conflictos','soft'),
    ('Pensamiento crítico',     'soft'),
    ('Adaptabilidad',           'soft'),
    ('Proactividad',            'soft'),
    ('Creatividad',             'soft'),
    ('Empatía',                 'soft'),
    ('Inteligencia emocional',  'soft'),
    ('Negociación',             'soft'),
    ('Atención al detalle',     'soft'),
    ('Orientación a resultados','soft'),
    ('Toma de decisiones',      'soft'),
    ('Oratoria',                'soft'),
    ('Gestión de proyectos',    'soft'),
    ('Metodologías Ágiles',     'soft'),
    ('Scrum',                   'soft')
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
