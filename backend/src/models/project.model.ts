import pg from 'pg';
import pool from '../config/db.js';
import { notFound } from '../utils/errors.js';

// ─── Tipos ─────────────────────────────────────────────────────────────────

export interface ProjectRow {
  id_proyecto: number;
  titulo: string;
  id_mentor: number | null;
  estado_actual: string;
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