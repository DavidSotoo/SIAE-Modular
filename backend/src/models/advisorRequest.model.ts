import pg from 'pg';
import pool from '../config/db.js';

// ─── Tipos ─────────────────────────────────────────────────────────────────

export type AdvisorRequestEstado = 'pendiente' | 'aceptada' | 'rechazada' | 'cancelada';

export interface AdvisorRequest {
  id_solicitud: number;
  id_proyecto: number;
  id_mentor: number;
  mensaje: string | null;
  estado: AdvisorRequestEstado;
  created_at: string;
  updated_at: string;
}

export interface CreateAdvisorRequestData {
  id_proyecto: number;
  id_mentor: number;
  mensaje?: string | null;
}

// ─── Queries ───────────────────────────────────────────────────────────────

export async function findAdvisorRequestById(
  id_solicitud: number,
): Promise<AdvisorRequest | null> {
  const res = await pool.query<AdvisorRequest>(
    `SELECT * FROM advisor_requests WHERE id_solicitud = $1`,
    [id_solicitud],
  );
  return res.rows[0] ?? null;
}

export async function findAdvisorRequestsByMentor(
  id_mentor: number,
): Promise<AdvisorRequest[]> {
  const res = await pool.query<AdvisorRequest>(
    `SELECT ar.*, p.titulo AS titulo_proyecto
     FROM advisor_requests ar
     JOIN projects p ON p.id_proyecto = ar.id_proyecto
     WHERE ar.id_mentor = $1
     ORDER BY ar.created_at DESC`,
    [id_mentor],
  );
  return res.rows;
}

/** ¿Ya existe una solicitud pendiente para este par (proyecto, mentor)? */
export async function findPendingAdvisorRequest(
  id_proyecto: number,
  id_mentor: number,
): Promise<AdvisorRequest | null> {
  const res = await pool.query<AdvisorRequest>(
    `SELECT * FROM advisor_requests
     WHERE id_proyecto = $1 AND id_mentor = $2 AND estado = 'pendiente'`,
    [id_proyecto, id_mentor],
  );
  return res.rows[0] ?? null;
}

/** Inserta una solicitud de asesoría. */
export async function createAdvisorRequest(
  client: pg.PoolClient,
  data: CreateAdvisorRequestData,
): Promise<AdvisorRequest> {
  const res = await client.query<AdvisorRequest>(
    `INSERT INTO advisor_requests (id_proyecto, id_mentor, mensaje)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [data.id_proyecto, data.id_mentor, data.mensaje ?? null],
  );
  return res.rows[0];
}

/** Actualiza el estado de una solicitud de asesoría (dentro de transacción). */
export async function updateAdvisorRequestEstado(
  client: pg.PoolClient,
  id_solicitud: number,
  estado: AdvisorRequestEstado,
): Promise<void> {
  await client.query(
    `UPDATE advisor_requests
     SET estado = $1, updated_at = now()
     WHERE id_solicitud = $2`,
    [estado, id_solicitud],
  );
}

/**
 * Asigna el mentor al proyecto SOLO si aún no tiene uno asignado.
 * Devuelve el rowCount del UPDATE para que el service detecte
 * si otro proceso ya asignó un mentor antes de que esta transacción completara.
 */
export async function assignMentorToProject(
  client: pg.PoolClient,
  id_proyecto: number,
  id_mentor: number,
): Promise<number> {
  const res = await client.query(
    `UPDATE projects
     SET id_mentor = $1, updated_at = now()
     WHERE id_proyecto = $2
       AND id_mentor IS NULL`,
    [id_mentor, id_proyecto],
  );
  return res.rowCount ?? 0;
}

/** Cancela las demás solicitudes pendientes de asesoría de un proyecto (excepto la aceptada).
 * Usa 'cancelada' (no 'rechazada') porque el mentor no las rechazó activamente.
 * 'cancelada' y no 'rechazada': el mentor no las rechazó activamente,
 * el proyecto simplemente ya consiguió su asesor.
 */
export async function cancelPendingAdvisorRequests(
  client: pg.PoolClient,
  id_proyecto: number,
  exceptId: number,
): Promise<void> {
  await client.query(
    `UPDATE advisor_requests
     SET estado = 'cancelada', updated_at = now()
     WHERE id_proyecto = $1
       AND estado = 'pendiente'
       AND id_solicitud != $2`,
    [id_proyecto, exceptId],
  );
}
