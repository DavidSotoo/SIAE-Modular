import pg from 'pg';
import pool from '../config/db.js';

// ─── Tipos ─────────────────────────────────────────────────────────────────

export interface StudentProfile {
  id_usuario: number;
  semestre: number | null;
  bio: string | null;
  portafolio_url: string | null;
  disponibilidad: string | null;
  estado_busqueda: 'buscando_equipo' | 'en_equipo' | 'no_disponible';
  updated_at: string;
}

export interface StudentSkillRow {
  id_skill: number;
  nombre: string;
  tipo: string;
  nivel: string;
}

export interface StudentInterestRow {
  id_area: number;
  nombre: string;
}

export interface StudentProfileFull extends StudentProfile {
  nombre: string;
  codigo_cucei: string;
  foto_url: string | null;
  skills: StudentSkillRow[];
  areas: StudentInterestRow[];
}

export interface UpsertProfileData {
  semestre?: number | null;
  bio?: string | null;
  portafolio_url?: string | null;
  disponibilidad?: string | null;
  estado_busqueda?: 'buscando_equipo' | 'en_equipo' | 'no_disponible';
}

export interface StudentSearchFilters {
  skill?: number;
  area?: number;
  estado_busqueda?: string;
  semestre_min?: number;
  semestre_max?: number;
}

// ─── Queries ───────────────────────────────────────────────────────────────

/** Devuelve el perfil completo de un alumno con sus skills y áreas. */
export async function findProfileByUserId(
  id_usuario: number,
): Promise<StudentProfileFull | null> {
  const profileRes = await pool.query<
    StudentProfile & { nombre: string; codigo_cucei: string; foto_url: string | null }
  >(
    `SELECT sp.id_usuario, sp.semestre, sp.bio, sp.portafolio_url,
            sp.disponibilidad, sp.estado_busqueda, sp.updated_at,
            u.nombre, u.codigo_cucei, u.foto_url
     FROM student_profiles sp
     JOIN users u ON u.id = sp.id_usuario
     WHERE sp.id_usuario = $1`,
    [id_usuario],
  );

  if (profileRes.rows.length === 0) return null;
  const profile = profileRes.rows[0];

  const [skillsRes, areasRes] = await Promise.all([
    pool.query<StudentSkillRow>(
      `SELECT ss.id_skill, s.nombre, s.tipo, ss.nivel
       FROM student_skills ss
       JOIN skills s ON s.id_skill = ss.id_skill
       WHERE ss.id_usuario = $1
       ORDER BY s.tipo, s.nombre`,
      [id_usuario],
    ),
    pool.query<StudentInterestRow>(
      `SELECT si.id_area, a.nombre
       FROM student_interests si
       JOIN areas_interes a ON a.id_area = si.id_area
       WHERE si.id_usuario = $1
       ORDER BY a.nombre`,
      [id_usuario],
    ),
  ]);

  return {
    ...profile,
    skills: skillsRes.rows,
    areas: areasRes.rows,
  };
}

/** Upsert del perfil base del alumno (dentro de una transacción). */
export async function upsertStudentProfile(
  client: pg.PoolClient,
  id_usuario: number,
  data: UpsertProfileData,
): Promise<void> {
  await client.query(
    `INSERT INTO student_profiles
       (id_usuario, semestre, bio, portafolio_url, disponibilidad, estado_busqueda, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, now())
     ON CONFLICT (id_usuario) DO UPDATE SET
       semestre        = EXCLUDED.semestre,
       bio             = EXCLUDED.bio,
       portafolio_url  = EXCLUDED.portafolio_url,
       disponibilidad  = EXCLUDED.disponibilidad,
       estado_busqueda = EXCLUDED.estado_busqueda,
       updated_at      = now()`,
    [
      id_usuario,
      data.semestre ?? null,
      data.bio ?? null,
      data.portafolio_url ?? null,
      data.disponibilidad ?? null,
      data.estado_busqueda ?? 'buscando_equipo',
    ],
  );
}

/** Reemplaza TODAS las skills del alumno (delete + insert en transacción). */
export async function replaceStudentSkills(
  client: pg.PoolClient,
  id_usuario: number,
  skills: Array<{ id_skill: number; nivel: string }>,
): Promise<void> {
  await client.query('DELETE FROM student_skills WHERE id_usuario = $1', [id_usuario]);
  for (const sk of skills) {
    await client.query(
      'INSERT INTO student_skills (id_usuario, id_skill, nivel) VALUES ($1, $2, $3)',
      [id_usuario, sk.id_skill, sk.nivel],
    );
  }
}

/** Reemplaza TODAS las áreas de interés del alumno (delete + insert en transacción). */
export async function replaceStudentInterests(
  client: pg.PoolClient,
  id_usuario: number,
  areas: number[],
): Promise<void> {
  await client.query('DELETE FROM student_interests WHERE id_usuario = $1', [id_usuario]);
  for (const id_area of areas) {
    await client.query(
      'INSERT INTO student_interests (id_usuario, id_area) VALUES ($1, $2)',
      [id_usuario, id_area],
    );
  }
}

/** Busca alumnos con filtros opcionales. Nunca devuelve password_hash. */
export async function searchStudents(
  filters: StudentSearchFilters,
): Promise<StudentProfileFull[]> {
  const conditions: string[] = ["sp.estado_busqueda != 'no_disponible'"];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.estado_busqueda) {
    conditions.push(`sp.estado_busqueda = $${idx++}`);
    params.push(filters.estado_busqueda);
  }
  if (filters.semestre_min !== undefined) {
    conditions.push(`sp.semestre >= $${idx++}`);
    params.push(filters.semestre_min);
  }
  if (filters.semestre_max !== undefined) {
    conditions.push(`sp.semestre <= $${idx++}`);
    params.push(filters.semestre_max);
  }
  if (filters.skill !== undefined) {
    conditions.push(
      `EXISTS (
         SELECT 1 FROM student_skills ss2
         WHERE ss2.id_usuario = sp.id_usuario AND ss2.id_skill = $${idx++}
       )`,
    );
    params.push(filters.skill);
  }
  if (filters.area !== undefined) {
    conditions.push(
      `EXISTS (
         SELECT 1 FROM student_interests si2
         WHERE si2.id_usuario = sp.id_usuario AND si2.id_area = $${idx++}
       )`,
    );
    params.push(filters.area);
  }

  const where = conditions.join(' AND ');

  const profilesRes = await pool.query<
    StudentProfile & { nombre: string; codigo_cucei: string }
  >(
    `SELECT sp.id_usuario, sp.semestre, sp.bio, sp.portafolio_url,
            sp.disponibilidad, sp.estado_busqueda, sp.updated_at,
            u.nombre, u.codigo_cucei
     FROM student_profiles sp
     JOIN users u ON u.id = sp.id_usuario
     WHERE ${where}
     ORDER BY sp.updated_at DESC`,
    params,
  );

  if (profilesRes.rows.length === 0) return [];

  const userIds = profilesRes.rows.map((r) => r.id_usuario);

  const [skillsRes, areasRes] = await Promise.all([
    pool.query<StudentSkillRow & { id_usuario: number }>(
      `SELECT ss.id_usuario, ss.id_skill, s.nombre, s.tipo, ss.nivel
       FROM student_skills ss
       JOIN skills s ON s.id_skill = ss.id_skill
       WHERE ss.id_usuario = ANY($1)`,
      [userIds],
    ),
    pool.query<StudentInterestRow & { id_usuario: number }>(
      `SELECT si.id_usuario, si.id_area, a.nombre
       FROM student_interests si
       JOIN areas_interes a ON a.id_area = si.id_area
       WHERE si.id_usuario = ANY($1)`,
      [userIds],
    ),
  ]);

  const skillsMap = new Map<number, StudentSkillRow[]>();
  const areasMap = new Map<number, StudentInterestRow[]>();

  for (const sk of skillsRes.rows) {
    if (!skillsMap.has(sk.id_usuario)) skillsMap.set(sk.id_usuario, []);
    skillsMap
      .get(sk.id_usuario)!
      .push({ id_skill: sk.id_skill, nombre: sk.nombre, tipo: sk.tipo, nivel: sk.nivel });
  }
  for (const ar of areasRes.rows) {
    if (!areasMap.has(ar.id_usuario)) areasMap.set(ar.id_usuario, []);
    areasMap.get(ar.id_usuario)!.push({ id_area: ar.id_area, nombre: ar.nombre });
  }

  return profilesRes.rows.map((p) => ({
    ...p,
    skills: skillsMap.get(p.id_usuario) ?? [],
    areas: areasMap.get(p.id_usuario) ?? [],
  }));
}

/** Actualiza solo el campo estado_busqueda de un alumno (dentro de transacción). */
export async function updateEstadoBusqueda(
  client: pg.PoolClient,
  id_usuario: number,
  estado: 'buscando_equipo' | 'en_equipo' | 'no_disponible',
): Promise<void> {
  await client.query(
    `UPDATE student_profiles
     SET estado_busqueda = $1, updated_at = now()
     WHERE id_usuario = $2`,
    [estado, id_usuario],
  );
}
