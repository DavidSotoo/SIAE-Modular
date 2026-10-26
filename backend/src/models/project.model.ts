import pg from 'pg';
import pool from '../config/db.js';
import { notFound } from '../utils/errors.js';

// Columnas de projects que se exponen al cliente. Se enumeran en vez de usar
// p.* porque el protocolo es un bytea que puede pesar megabytes: mandarlo en
// el JSON de cada proyecto seria absurdo. Del PDF solo interesa si existe.
const COLUMNAS_PROYECTO = `p.id_proyecto, p.titulo, p.descripcion, p.id_mentor,
     p.estado_actual, p.pdf_visualizado, p.created_at, p.updated_at,
     (p.pdf_contenido IS NOT NULL) AS tiene_pdf`;

// ─── Tipos ─────────────────────────────────────────────────────────────────

export interface ProjectRow {
  id_proyecto: number;
  titulo: string;
  descripcion: string | null;
  id_mentor: number | null;
  estado_actual: string;
  tiene_pdf: boolean;
  pdf_visualizado: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  codigo_cucei: string;
  nombre: string;
  es_lider: boolean;
}

export interface ProjectWithMembers extends ProjectRow {
  miembros: ProjectMember[];
}

// ─── Queries ───────────────────────────────────────────────────────────────

export async function findProjectMentorId(id_proyecto: number): Promise<number | null> {
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
  descripcion: string,
): Promise<ProjectRow> {
  const res = await client.query<ProjectRow>(
    `INSERT INTO projects (titulo, descripcion, estado_actual, id_mentor)
     VALUES ($1, $2, 'borrador', NULL)
     RETURNING *`,
    [titulo, descripcion],
  );
  return res.rows[0];
}

export async function findActiveProjectByAlumno(
  codigo_alumno: string,
): Promise<(ProjectWithMembers & { codigo_folio: string | null }) | null> {
  const projRes = await pool.query<ProjectRow & { codigo_folio: string | null }>(
    `SELECT ${COLUMNAS_PROYECTO}, f.codigo_folio
     FROM projects p
     JOIN project_members pm ON pm.id_proyecto = p.id_proyecto
     LEFT JOIN folios f ON f.id_proyecto = p.id_proyecto
     WHERE pm.codigo_alumno = $1 AND p.estado_actual != 'cancelado'
     LIMIT 1`,
    [codigo_alumno],
  );

  if (projRes.rows.length === 0) return null;
  const project = projRes.rows[0];

  const memRes = await pool.query<ProjectMember>(
    `SELECT u.codigo_cucei, u.nombre, pm.es_lider
     FROM users u
     JOIN project_members pm ON pm.codigo_alumno = u.codigo_cucei
     WHERE pm.id_proyecto = $1
     ORDER BY pm.es_lider DESC, u.nombre`,
    [project.id_proyecto],
  );

  return { ...project, miembros: memRes.rows };
}

export async function findProjectsByMentor(
  id_mentor: number,
): Promise<Array<ProjectWithMembers & { codigo_folio: string | null }>> {
  const projRes = await pool.query<ProjectRow & { codigo_folio: string | null }>(
    `SELECT ${COLUMNAS_PROYECTO}, f.codigo_folio
     FROM projects p
     LEFT JOIN folios f ON f.id_proyecto = p.id_proyecto
     WHERE p.id_mentor = $1
     ORDER BY p.updated_at DESC`,
    [id_mentor],
  );
  if (projRes.rows.length === 0) return [];

  const ids = projRes.rows.map((r) => r.id_proyecto);
  const memRes = await pool.query<ProjectMember & { id_proyecto: number }>(
    `SELECT pm.id_proyecto, u.codigo_cucei, u.nombre, pm.es_lider
     FROM users u
     JOIN project_members pm ON pm.codigo_alumno = u.codigo_cucei
     WHERE pm.id_proyecto = ANY($1)
     ORDER BY pm.es_lider DESC, u.nombre`,
    [ids],
  );

  const membersByProject = new Map<number, ProjectMember[]>();
  memRes.rows.forEach((r) => {
    if (!membersByProject.has(r.id_proyecto)) membersByProject.set(r.id_proyecto, []);
    membersByProject
      .get(r.id_proyecto)!
      .push({ codigo_cucei: r.codigo_cucei, nombre: r.nombre, es_lider: r.es_lider });
  });

  return projRes.rows.map((p) => ({ ...p, miembros: membersByProject.get(p.id_proyecto) ?? [] }));
}

export async function updateProjectStateAndPdf(
  id_proyecto: number,
  estadosOrigen: string[],
  estado_nuevo: string,
  pdf?: { contenido: Buffer; nombre: string },
  client?: pg.PoolClient,
): Promise<boolean> {
  const db = client || pool;

  let query = `UPDATE projects SET estado_actual = $1, updated_at = now()`;
  const values: unknown[] = [estado_nuevo];

  if (pdf !== undefined) {
    values.push(pdf.contenido, pdf.nombre);
    // pdf_visualizado vuelve a false: el mentor tiene que abrir el protocolo
    // nuevo antes de poder validarlo (IMF-03).
    query += `, pdf_contenido = $${values.length - 1}, pdf_nombre = $${values.length}, pdf_visualizado = false`;
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

export async function findProjectPdf(
  id_proyecto: number,
): Promise<{ contenido: Buffer; nombre: string } | null> {
  const res = await pool.query<{ pdf_contenido: Buffer | null; pdf_nombre: string | null }>(
    `SELECT pdf_contenido, pdf_nombre FROM projects WHERE id_proyecto = $1`,
    [id_proyecto],
  );
  if (res.rows.length === 0) throw notFound('Proyecto no encontrado');
  const { pdf_contenido, pdf_nombre } = res.rows[0];
  if (!pdf_contenido) return null;
  return { contenido: pdf_contenido, nombre: pdf_nombre ?? 'protocolo.pdf' };
}

export async function isProjectPdfVisualizado(id_proyecto: number): Promise<boolean> {
  const res = await pool.query<{ pdf_visualizado: boolean }>(
    `SELECT pdf_visualizado FROM projects WHERE id_proyecto = $1`,
    [id_proyecto],
  );
  if (res.rows.length === 0) throw notFound('Proyecto no encontrado');
  return res.rows[0].pdf_visualizado;
}

export async function markPdfVisualizado(id_proyecto: number): Promise<void> {
  await pool.query(`UPDATE projects SET pdf_visualizado = true WHERE id_proyecto = $1`, [
    id_proyecto,
  ]);
}
