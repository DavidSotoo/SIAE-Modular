-- SIAE-Modular — SM-40: "El creador del proyecto es el líder".
-- Solo marca al líder; no le da permisos distintos a los demás integrantes.

ALTER TABLE project_members
    ADD COLUMN es_lider BOOLEAN NOT NULL DEFAULT false;

-- Un solo líder por proyecto
CREATE UNIQUE INDEX uq_project_members_lider
    ON project_members (id_proyecto)
    WHERE es_lider;

-- Proyectos que ya existían: no se guardaba quién los creó. El creador es el
-- integrante que no entró por una solicitud de equipo aceptada (los demás
-- entraron por invitación o solicitud). Si hubiera más de uno, se toma el
-- primero por código para que el índice único no falle.
UPDATE project_members pm
SET es_lider = true
FROM (
    SELECT DISTINCT ON (pm2.id_proyecto) pm2.id_proyecto, pm2.codigo_alumno
    FROM project_members pm2
    WHERE NOT EXISTS (
        SELECT 1
        FROM team_requests tr
        WHERE tr.id_proyecto = pm2.id_proyecto
          AND tr.estado = 'aceptada'
          AND pm2.codigo_alumno = CASE tr.tipo
                                    WHEN 'invitacion' THEN tr.codigo_alumno_receptor
                                    ELSE tr.codigo_alumno_emisor
                                  END
    )
    ORDER BY pm2.id_proyecto, pm2.codigo_alumno
) creador
WHERE pm.id_proyecto = creador.id_proyecto
  AND pm.codigo_alumno = creador.codigo_alumno;
