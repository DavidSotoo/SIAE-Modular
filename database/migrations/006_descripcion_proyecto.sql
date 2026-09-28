-- SIAE-Modular — SM-40: "Descripción del proyecto (no más de 100 palabras)".
-- Obligatoria al crear un proyecto (se valida en la app). La columna admite
-- NULL solo para no romper los proyectos que ya existían antes de este cambio.

ALTER TABLE projects
    ADD COLUMN descripcion TEXT;
