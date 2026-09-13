import pg from 'pg';
import pool from '../config/db.js';

export interface ProjectStateLog {
  id_log: number;
  id_proyecto: number;
  estado_anterior: string | null;
  estado_nuevo: string;
  id_usuario_accion: number;
  timestamp: string;
  comentario: string | null;
}

export async function insertStateLog(
  id_proyecto: number,
  estado_anterior: string | null,
  estado_nuevo: string,
  id_usuario_accion: number,
  comentario: string | null,
  client?: pg.PoolClient
): Promise<void> {
  const db = client || pool;
  await db.query(
    `INSERT INTO state_logs (id_proyecto, estado_anterior, estado_nuevo, id_usuario_accion, comentario)
     VALUES ($1, $2, $3, $4, $5)`,
    [id_proyecto, estado_anterior, estado_nuevo, id_usuario_accion, comentario]
  );
}

export async function getProjectHistory(id_proyecto: number): Promise<ProjectStateLog[]> {
  const res = await pool.query<ProjectStateLog>(
    `SELECT * FROM state_logs
     WHERE id_proyecto = $1
     ORDER BY timestamp DESC`,
    [id_proyecto]
  );
  return res.rows;
}
