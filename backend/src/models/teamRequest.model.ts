import pg from 'pg';
import pool from '../config/db.js';
import { conflict } from '../utils/errors.js';

// ─── Tipos ─────────────────────────────────────────────────────────────────

export type TeamRequestEstado = 'pendiente' | 'aceptada' | 'rechazada' | 'cancelada';
export type TeamRequestTipo = 'invitacion' | 'solicitud';

export interface TeamRequest {
  id_solicitud: number;
  id_proyecto: number;
  codigo_alumno_emisor: string;
  codigo_alumno_receptor: string;
  tipo: TeamRequestTipo;
  mensaje: string | null;
  estado: TeamRequestEstado;
  /**
   * Alumno que se integrará al equipo si la solicitud es aceptada.
   * Campo calculado en la query (no columna física en la tabla):
   *   invitacion → codigo_alumno_receptor (el invitado se une)
   *   solicitud  → codigo_alumno_emisor   (quien pide se une)
   */
  codigo_alumno_candidato: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTeamRequestData {
  id_proyecto: number;
  codigo_alumno_emisor: string;
  codigo_alumno_receptor: string;
  tipo: TeamRequestTipo;
  mensaje?: string | null;
}

// ─── Queries ───────────────────────────────────────────────────────────────

export async function findTeamRequestById(
  id_solicitud: number,
): Promise<TeamRequest | null> {
  const res = await pool.query<TeamRequest>(
    `SELECT *,
            CASE WHEN tipo = 'invitacion' THEN codigo_alumno_receptor
                 ELSE codigo_alumno_emisor
            END AS codigo_alumno_candidato
     FROM team_requests
     WHERE id_solicitud = $1`,
    [id_solicitud],
  );
  return res.rows[0] ?? null;
}

export async function findTeamRequestsByProject(
  id_proyecto: number,
): Promise<TeamRequest[]> {
  const res = await pool.query<TeamRequest>(
    `SELECT *,
            CASE WHEN tipo = 'invitacion' THEN codigo_alumno_receptor
                 ELSE codigo_alumno_emisor
            END AS codigo_alumno_candidato
     FROM team_requests
     WHERE id_proyecto = $1
     ORDER BY created_at DESC`,
    [id_proyecto],
  );
  return res.rows;
}

export async function findTeamRequestsByStudent(
  codigo_alumno: string,
): Promise<TeamRequest[]> {
  const res = await pool.query<TeamRequest>(
    `SELECT *,
            CASE WHEN tipo = 'invitacion' THEN codigo_alumno_receptor
                 ELSE codigo_alumno_emisor
            END AS codigo_alumno_candidato
     FROM team_requests
     WHERE codigo_alumno_emisor = $1 OR codigo_alumno_receptor = $1
     ORDER BY created_at DESC`,
    [codigo_alumno],
  );
  return res.rows;
}

/** ¿Ya existe una solicitud pendiente para este par (proyecto, alumno receptor)? */
export async function findPendingTeamRequest(
  id_proyecto: number,
  codigo_alumno_receptor: string,
): Promise<TeamRequest | null> {
  const res = await pool.query<TeamRequest>(
    `SELECT * FROM team_requests
     WHERE id_proyecto = $1
       AND codigo_alumno_receptor = $2
       AND estado = 'pendiente'`,
    [id_proyecto, codigo_alumno_receptor],
  );
  return res.rows[0] ?? null;
}

/** ¿El alumno ya es miembro del proyecto? */
export async function isAlumnoInProject(
  id_proyecto: number,
  codigo_alumno: string,
): Promise<boolean> {
  const res = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS(
       SELECT 1 FROM project_members
       WHERE id_proyecto = $1 AND codigo_alumno = $2
     ) AS exists`,
    [id_proyecto, codigo_alumno],
  );
  return res.rows[0].exists;
}

/** Cuenta los integrantes actuales del proyecto. */
export async function countProjectMembers(
  id_proyecto: number,
  db: pg.Pool | pg.PoolClient = pool,
): Promise<number> {
  const res = await db.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM project_members WHERE id_proyecto = $1`,
    [id_proyecto],
  );
  return parseInt(res.rows[0].count, 10);
}

/**
 * ¿El alumno tiene un proyecto activo?
 * Activo = pertenece a project_members de un proyecto con estado != 'cancelado'.
 */
export async function hasActiveProject(
  codigo_alumno: string,
  db: pg.Pool | pg.PoolClient = pool,
): Promise<boolean> {
  const res = await db.query<{ exists: boolean }>(
    `SELECT EXISTS(
       SELECT 1
       FROM project_members pm
       JOIN projects p ON p.id_proyecto = pm.id_proyecto
       WHERE pm.codigo_alumno = $1
         AND p.estado_actual != 'cancelado'
     ) AS exists`,
    [codigo_alumno],
  );
  return res.rows[0].exists;
}

/** Inserta la solicitud de equipo y devuelve el registro creado.
 * Captura la violación del índice parcial único (código pg 23505) para traducirla
 * a un error de negocio tipado, evitando que una race condition entre como HTTP 500.
 */
export async function createTeamRequest(
  client: pg.PoolClient,
  data: CreateTeamRequestData,
): Promise<TeamRequest> {
  try {
    const res = await client.query<TeamRequest>(
      `INSERT INTO team_requests
         (id_proyecto, codigo_alumno_emisor, codigo_alumno_receptor, tipo, mensaje)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.id_proyecto,
        data.codigo_alumno_emisor,
        data.codigo_alumno_receptor,
        data.tipo,
        data.mensaje ?? null,
      ],
    );
    return res.rows[0];
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      'code' in err &&
      (err as NodeJS.ErrnoException).code === '23505'
    ) {
      throw conflict(
        'Ya existe una solicitud pendiente para este alumno en este proyecto',
        'DUPLICATE_REQUEST',
      );
    }
    throw err;
  }
}

/** Actualiza el estado de una solicitud de equipo (dentro de transacción). */
export async function updateTeamRequestEstado(
  client: pg.PoolClient,
  id_solicitud: number,
  estado: TeamRequestEstado,
): Promise<void> {
  await client.query(
    `UPDATE team_requests
     SET estado = $1, updated_at = now()
     WHERE id_solicitud = $2`,
    [estado, id_solicitud],
  );
}

/** Inserta un nuevo integrante al proyecto (dentro de transacción). */
export async function insertProjectMember(
  client: pg.PoolClient,
  id_proyecto: number,
  codigo_alumno: string,
): Promise<void> {
  await client.query(
    `INSERT INTO project_members (id_proyecto, codigo_alumno)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [id_proyecto, codigo_alumno],
  );
}

/**
 * Cancela todas las solicitudes 'pendiente' de un proyecto
 * excepto la indicada (útil cuando el equipo llega a su límite).
 */
export async function cancelPendingTeamRequests(
  client: pg.PoolClient,
  id_proyecto: number,
  exceptId?: number,
): Promise<void> {
  if (exceptId !== undefined) {
    await client.query(
      `UPDATE team_requests
       SET estado = 'cancelada', updated_at = now()
       WHERE id_proyecto = $1
         AND estado = 'pendiente'
         AND id_solicitud != $2`,
      [id_proyecto, exceptId],
    );
  } else {
    await client.query(
      `UPDATE team_requests
       SET estado = 'cancelada', updated_at = now()
       WHERE id_proyecto = $1 AND estado = 'pendiente'`,
      [id_proyecto],
    );
  }
}

/** Recupera el id de usuario a partir de codigo_cucei. */
export async function findUserIdByCodigo(
  codigo_cucei: string,
): Promise<number | null> {
  const res = await pool.query<{ id: number }>(
    `SELECT id FROM users WHERE codigo_cucei = $1`,
    [codigo_cucei],
  );
  return res.rows[0]?.id ?? null;
}
