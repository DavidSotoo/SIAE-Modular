import pg from 'pg';
import pool from '../config/db.js';

// ─── Tipos ─────────────────────────────────────────────────────────────────

export interface AdvisorProfile {
  id_usuario: number;
  especialidad: string | null;
  disponible: boolean;
  cupo_maximo: number;
  acepta_coasesoria: boolean;
  updated_at: string;
}

export interface AdvisorAreaRow {
  id_area: number;
  nombre: string;
}

export interface AdvisorProfileFull extends AdvisorProfile {
  nombre: string;
  codigo_cucei: string;
  areas: AdvisorAreaRow[];
}

export interface AdvisorSearchResult extends AdvisorProfileFull {
  proyectos_activos: number;
}

export interface UpsertAdvisorData {
  especialidad?: string | null;
  disponible?: boolean;
  cupo_maximo?: number;
  acepta_coasesoria?: boolean;
}

// ─── Queries ───────────────────────────────────────────────────────────────

export async function findAdvisorProfileByUserId(
  id_usuario: number,
): Promise<AdvisorProfileFull | null> {
  const profileRes = await pool.query<
    AdvisorProfile & { nombre: string; codigo_cucei: string }
  >(
    `SELECT ap.id_usuario, ap.especialidad, ap.disponible, ap.cupo_maximo,
            ap.acepta_coasesoria, ap.updated_at, u.nombre, u.codigo_cucei
     FROM advisor_profiles ap
     JOIN users u ON u.id = ap.id_usuario
     WHERE ap.id_usuario = $1`,
    [id_usuario],
  );

  if (profileRes.rows.length === 0) return null;
  const profile = profileRes.rows[0];

  const areasRes = await pool.query<AdvisorAreaRow>(
    `SELECT aa.id_area, a.nombre
     FROM advisor_areas aa
     JOIN areas_interes a ON a.id_area = aa.id_area
     WHERE aa.id_usuario = $1
     ORDER BY a.nombre`,
    [id_usuario],
  );

  return { ...profile, areas: areasRes.rows };
}

/** Upsert del perfil de disponibilidad del asesor (dentro de transacción). */
export async function upsertAdvisorProfile(
  client: pg.PoolClient,
  id_usuario: number,
  data: UpsertAdvisorData,
): Promise<void> {
  await client.query(
    `INSERT INTO advisor_profiles
       (id_usuario, especialidad, disponible, cupo_maximo, acepta_coasesoria, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (id_usuario) DO UPDATE SET
       especialidad      = EXCLUDED.especialidad,
       disponible        = EXCLUDED.disponible,
       cupo_maximo       = EXCLUDED.cupo_maximo,
       acepta_coasesoria = EXCLUDED.acepta_coasesoria,
       updated_at        = now()`,
    [
      id_usuario,
      data.especialidad ?? null,
      data.disponible ?? true,
      data.cupo_maximo ?? 3,
      data.acepta_coasesoria ?? false,
    ],
  );
}

/** Reemplaza TODAS las áreas del asesor (delete + insert en transacción). */
export async function replaceAdvisorAreas(
  client: pg.PoolClient,
  id_usuario: number,
  areas: number[],
): Promise<void> {
  await client.query('DELETE FROM advisor_areas WHERE id_usuario = $1', [id_usuario]);
  for (const id_area of areas) {
    await client.query(
      'INSERT INTO advisor_areas (id_usuario, id_area) VALUES ($1, $2)',
      [id_usuario, id_area],
    );
  }
}

/**
 * Busca asesores con disponible = true y cupo libre.
 * Cupo libre = proyectos activos asignados < cupo_maximo
 * (proyecto activo = estado_actual != 'cancelado')
 */
export async function searchAdvisors(areaId?: number): Promise<AdvisorSearchResult[]> {
  const areaFilter = areaId
    ? `AND EXISTS (
         SELECT 1 FROM advisor_areas aa2
         WHERE aa2.id_usuario = ap.id_usuario AND aa2.id_area = $1
       )`
    : '';
  const params: unknown[] = areaId ? [areaId] : [];

  const profilesRes = await pool.query<
    AdvisorProfile & { nombre: string; codigo_cucei: string; proyectos_activos: string }
  >(
    `SELECT ap.id_usuario, ap.especialidad, ap.disponible, ap.cupo_maximo,
            ap.acepta_coasesoria, ap.updated_at,
            u.nombre, u.codigo_cucei,
            COUNT(p.id_proyecto) FILTER (
              WHERE p.estado_actual != 'cancelado'
            ) AS proyectos_activos
     FROM advisor_profiles ap
     JOIN users u ON u.id = ap.id_usuario
     LEFT JOIN projects p ON p.id_mentor = ap.id_usuario
     WHERE ap.disponible = true
       ${areaFilter}
     GROUP BY ap.id_usuario, u.nombre, u.codigo_cucei
     HAVING COUNT(p.id_proyecto) FILTER (
              WHERE p.estado_actual != 'cancelado'
            ) < ap.cupo_maximo
     ORDER BY ap.updated_at DESC`,
    params,
  );

  if (profilesRes.rows.length === 0) return [];

  const userIds = profilesRes.rows.map((r) => r.id_usuario);
  const areasRes = await pool.query<AdvisorAreaRow & { id_usuario: number }>(
    `SELECT aa.id_usuario, aa.id_area, a.nombre
     FROM advisor_areas aa
     JOIN areas_interes a ON a.id_area = aa.id_area
     WHERE aa.id_usuario = ANY($1)`,
    [userIds],
  );

  const areasMap = new Map<number, AdvisorAreaRow[]>();
  for (const ar of areasRes.rows) {
    if (!areasMap.has(ar.id_usuario)) areasMap.set(ar.id_usuario, []);
    areasMap.get(ar.id_usuario)!.push({ id_area: ar.id_area, nombre: ar.nombre });
  }

  return profilesRes.rows.map((p) => ({
    ...p,
    proyectos_activos: parseInt(p.proyectos_activos, 10),
    areas: areasMap.get(p.id_usuario) ?? [],
  }));
}

/**
 * ¿El asesor tiene cupo disponible?
 * Devuelve true si proyectos activos < cupo_maximo y disponible = true.
 *
 * Acepta un pool o un PoolClient para poder ejecutarse dentro de una
 * transacción existente con bloqueo FOR UPDATE, necesario para serializar
 * la verificación de cupo y evitar race conditions al aceptar solicitudes.
 *
 * @param db  Pass `pool` para consultas fuera de tx; pass `client` dentro de tx.
 * @param forUpdate  Si true, agrega SELECT ... FOR UPDATE sobre advisor_profiles.
 */
export async function advisorHasCupo(
  id_mentor: number,
  db: pg.Pool | pg.PoolClient = pool,
  forUpdate = false,
): Promise<boolean> {
  if (forUpdate) {
    // Postgres no permite FOR UPDATE junto con GROUP BY/JOIN agregado, así que
    // primero bloqueamos la fila del asesor (sin agregación) y luego contamos
    // sus proyectos activos por separado; el lock ya serializa aceptaciones concurrentes.
    const lockRes = await db.query<{ disponible: boolean; cupo_maximo: number }>(
      `SELECT disponible, cupo_maximo FROM advisor_profiles WHERE id_usuario = $1 FOR UPDATE`,
      [id_mentor],
    );
    if (lockRes.rows.length === 0) return false;
    const { disponible, cupo_maximo } = lockRes.rows[0];
    if (!disponible) return false;

    const countRes = await db.query<{ activos: string }>(
      `SELECT COUNT(*) FILTER (WHERE estado_actual != 'cancelado') AS activos
       FROM projects WHERE id_mentor = $1`,
      [id_mentor],
    );
    return parseInt(countRes.rows[0].activos, 10) < cupo_maximo;
  }

  const res = await db.query<{ disponible: boolean; cupo_maximo: number; activos: string }>(
    `SELECT ap.disponible, ap.cupo_maximo,
            COUNT(p.id_proyecto) FILTER (WHERE p.estado_actual != 'cancelado') AS activos
     FROM advisor_profiles ap
     LEFT JOIN projects p ON p.id_mentor = ap.id_usuario
     WHERE ap.id_usuario = $1
     GROUP BY ap.id_usuario, ap.disponible, ap.cupo_maximo`,
    [id_mentor],
  );

  if (res.rows.length === 0) return false;
  const { disponible, cupo_maximo, activos } = res.rows[0];
  return disponible && parseInt(activos, 10) < cupo_maximo;
}
