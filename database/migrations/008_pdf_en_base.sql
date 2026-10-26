-- SIAE-Modular — Los protocolos PDF pasan del disco a la base de datos.
-- En hosting gratuito (Vercel) el sistema de archivos es efímero y de solo
-- lectura: un PDF escrito en uploads/ desaparece en el siguiente despliegue.
-- Guardarlo en la fila del proyecto lo hace persistente sin contratar un
-- servicio de almacenamiento aparte.

ALTER TABLE projects
    ADD COLUMN pdf_contenido BYTEA,
    ADD COLUMN pdf_nombre VARCHAR(255);

-- Las rutas que había apuntaban a archivos locales que ningún despliegue puede
-- leer, así que no hay nada que migrar: la columna se va.
ALTER TABLE projects
    DROP COLUMN pdf_path;
