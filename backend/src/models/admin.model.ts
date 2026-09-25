import pool from '../config/db.js';

export interface AdminProjectRow {
  id_proyecto: number;
  titulo: string;
  estado_actual: string;
  codigo_folio: string | null;
  fecha_folio: string | null;
  id_mentor: number | null;
  mentor_nombre: string | null;
  num_integrantes: number;
  created_at: string;
  updated_at: string;
}

export interface AdminProjectFilters {
  estado?: string;
  search?: string;
}

function buildWhereClause(filters: AdminProjectFilters, values: unknown[]): string {
  const conditions: string[] = [];

  if (filters.estado) {
    values.push(filters.estado);
    conditions.push(`p.estado_actual = $${values.length}::project_state`);
  }

  if (filters.search) {
    values.push(`%${filters.search}%`);
    const idx = values.length;
    conditions.push(`(p.titulo ILIKE $${idx} OR f.codigo_folio ILIKE $${idx})`);
  }

  return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
}

export async function findAllProjectsForAdmin(
  filters: AdminProjectFilters,
): Promise<AdminProjectRow[]> {
  const values: unknown[] = [];
  const whereClause = buildWhereClause(filters, values);

  const res = await pool.query<AdminProjectRow>(
    `SELECT
       p.id_proyecto,
       p.titulo,
       p.estado_actual,
       f.codigo_folio,
       f.fecha_emision AS fecha_folio,
       p.id_mentor,
       m.nombre AS mentor_nombre,
       COUNT(DISTINCT pm.codigo_alumno)::int AS num_integrantes,
       p.created_at,
       p.updated_at
     FROM projects p
     LEFT JOIN folios f ON f.id_proyecto = p.id_proyecto
     LEFT JOIN users m ON m.id = p.id_mentor
     LEFT JOIN project_members pm ON pm.id_proyecto = p.id_proyecto
     ${whereClause}
     GROUP BY p.id_proyecto, f.codigo_folio, f.fecha_emision, m.nombre
     ORDER BY p.created_at DESC`,
    values,
  );
  return res.rows;
}

export interface AdminProjectDetail extends AdminProjectRow {
  descripcion: string | null;
  miembros: { codigo_cucei: string; nombre: string }[];
}

export async function findProjectDetailForAdmin(
  id_proyecto: number,
): Promise<AdminProjectDetail | null> {
  const res = await pool.query<AdminProjectRow & { descripcion: string | null }>(
    `SELECT
       p.id_proyecto,
       p.titulo,
       p.descripcion,
       p.estado_actual,
       f.codigo_folio,
       f.fecha_emision AS fecha_folio,
       p.id_mentor,
       m.nombre AS mentor_nombre,
       COUNT(DISTINCT pm.codigo_alumno)::int AS num_integrantes,
       p.created_at,
       p.updated_at
     FROM projects p
     LEFT JOIN folios f ON f.id_proyecto = p.id_proyecto
     LEFT JOIN users m ON m.id = p.id_mentor
     LEFT JOIN project_members pm ON pm.id_proyecto = p.id_proyecto
     WHERE p.id_proyecto = $1
     GROUP BY p.id_proyecto, f.codigo_folio, f.fecha_emision, m.nombre`,
    [id_proyecto],
  );
  if (res.rows.length === 0) return null;

  const memRes = await pool.query<{ codigo_cucei: string; nombre: string }>(
    `SELECT u.codigo_cucei, u.nombre
     FROM users u
     JOIN project_members pm ON pm.codigo_alumno = u.codigo_cucei
     WHERE pm.id_proyecto = $1`,
    [id_proyecto],
  );

  return { ...res.rows[0], miembros: memRes.rows };
}

export interface AdminStats {
  total_proyectos: number;
  por_estado: Record<string, number>;
  total_folios: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const totalRes = await pool.query<{ count: string }>(`SELECT COUNT(*) FROM projects`);
  const estadoRes = await pool.query<{ estado_actual: string; count: string }>(
    `SELECT estado_actual, COUNT(*) FROM projects GROUP BY estado_actual`,
  );
  const folioRes = await pool.query<{ count: string }>(`SELECT COUNT(*) FROM folios`);

  const por_estado: Record<string, number> = {};
  estadoRes.rows.forEach((r) => { por_estado[r.estado_actual] = parseInt(r.count, 10); });

  return {
    total_proyectos: parseInt(totalRes.rows[0].count, 10),
    por_estado,
    total_folios: parseInt(folioRes.rows[0].count, 10),
  };
}
