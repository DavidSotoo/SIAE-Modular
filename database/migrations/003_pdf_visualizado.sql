-- SIAE-Modular — IMF-03 (Sprint 2/4 de Diseño): "El sistema bloquea la
-- aprobación si el mentor no ha visualizado el PDF". Se necesita rastrear
-- si el mentor ya abrió el protocolo vigente antes de permitir la
-- transición Pendiente -> Validado.

ALTER TABLE projects
    ADD COLUMN pdf_visualizado BOOLEAN NOT NULL DEFAULT false;
