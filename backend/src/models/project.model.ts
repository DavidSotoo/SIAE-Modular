import pg from 'pg';
import pool from '../config/db.js';
import { notFound } from '../utils/errors.js';

// ─── Tipos ─────────────────────────────────────────────────────────────────

export interface ProjectRow {
  id_proyecto: number;
  titulo: string;
  id_mentor: number | null;
  estado_actual: string;
  pdf_path: string | null;
  pdf_visualizado: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithMembers extends ProjectRow {
  miembros: { codigo_cucei: string; nombre: string }[];
}

// ─── Queries ───────────────────────────────────────────────────────────────

export async function findProjectMentorId(
  id_proyecto: number,
): Promise<number | null> {
  const res = await pool.query<{ id_mentor: number | null }>(
    `SELECT id_mentor FROM projects WHERE id_proyecto = $1`,
    [id_proyecto],
  );
  if (res.rows.length === 0) throw notFound('Proyecto no encontrado');
  return res.rows[0].id_mentor;
}

export async function createProject(
  client: pg.PoolClient,
  titulo: string,
): Promise<ProjectRow> {
  const res = await client.query<ProjectRow>(
    `INSERT INTO projects (titulo, estado_actual, id_mentor)
     VALUES ($1, 'borrador', NULL)
     RETURNING *`,
    [titulo],
  );
  return res.rows[0];
}

export async function findActiveProjectByAlumno(
  codigo_alumno: string,
): Promise<ProjectWithMembers | null> {
  const projRes = await pool.query<ProjectRow>(
    `SELECT p.*
     FROM projects p
     JOIN project_members pm ON pm.id_proyecto = p.id_proyecto
     WHERE pm.codigo_alumno = $1 AND p.estado_actual != 'cancelado'
     LIMIT 1`,
    [codigo_alumno],
  );
  
  if (projRes.rows.length === 0) return null;
  const project = projRes.rows[0];

  const memRes = await pool.query<{ codigo_cucei: string; nombre: string }>(
    `SELECT u.codigo_cucei, u.nombre
     FROM users u
     JOIN project_members pm ON pm.codigo_alumno = u.codigo_cucei
     WHERE pm.id_proyecto = $1`,
    [project.id_proyecto],
  );

  return { ...project, miembros: memRes.rows };
}

export async function updateProjectStateAndPdf(
  id_proyecto: number,
  estadosOrigen: string[],
  estado_nuevo: string,
  pdf_path?: string,
  client?: pg.PoolClient
): Promise<boolean> {
  const db = client || pool;

  let query = `UPDATE projects SET estado_actual = $1, updated_at = now()`;
  const values: any[] = [estado_nuevo];

  if (pdf_path !== undefined) {
    values.push(pdf_path);
    query += `, pdf_path = $${values.length}, pdf_visualizado = false`;
  }

  values.push(id_proyecto);
  query += ` WHERE id_proyecto = $${values.length}`;

  if (estadosOrigen.length > 0) {
    query += ` AND estado_actual = ANY($${values.length + 1}::project_state[])`;
    values.push(estadosOrigen);
  }

  const res = await db.query(query, values);
  return (res.rowCount ?? 0) > 0;
}

export async function findProjectPdfPath(
  id_proyecto: number,
): Promise<string | null> {
  const res = await pool.query<{ pdf_path: string | null }>(
    `SELECT pdf_path FROM projects WHERE id_proyecto = $1`,
    [id_proyecto],
  );
  if (res.rows.length === 0) throw notFound('Proyecto no encontrado');
  return res.rows[0].pdf_path;
}

export async function isProjectPdfVisualizado(
  id_proyecto: number,
): Promise<boolean> {
  const res = await pool.query<{ pdf_visualizado: boolean }>(
    `SELECT pdf_visualizado FROM projects WHERE id_proyecto = $1`,
    [id_proyecto],
  );
  if (res.rows.length === 0) throw notFound('Proyecto no encontrado');
  return res.rows[0].pdf_visualizado;
}

export async function markPdfVisualizado(id_proyecto: number): Promise<void> {
  await pool.query(
    `UPDATE projects SET pdf_visualizado = true WHERE id_proyecto = $1`,
    [id_proyecto],
  );
}