// Utilidades compartidas por las pruebas de integracion.
//
// Las pruebas crean sus propios usuarios con codigo_cucei con prefijo "99" y
// proyectos con titulo "TEST-", para poder borrarlos sin tocar datos reales.
import jwt from 'jsonwebtoken';
import pool from '../src/config/db.js';
import type { Rol } from '../src/models/user.model.js';

export const PDF_BYTES = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\n' +
    'trailer<</Root 1 0 R>>\n%%EOF\n',
);

/** Codigos CUCEI de los usuarios de prueba. El prefijo 99 los aisla. */
export const CODES = {
  A1: '990000001',
  A2: '990000002',
  A3: '990000003',
  A4: '990000004',
  A5: '990000005',
  A6: '990000006',
  A7: '990000007',
  A8: '990000008',
  M1: '990000101',
  M2: '990000102',
  AD: '990000201',
  ONB_NUEVO: '990000777',
} as const;

export const DESCRIPCION_VALIDA =
  'Descripcion valida de prueba para verificar el flujo completo del motor de estados.';

export function tokenFor(id: number, codigo_cucei: string | null, rol: Rol): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET no configurado para las pruebas');
  return jwt.sign({ id, codigo_cucei, rol }, secret, { expiresIn: '1h' });
}

export const auth = (token: string) => ['Authorization', `Bearer ${token}`] as const;

/**
 * Borra todo rastro de corridas anteriores. `folios` referencia `projects` con
 * una FK sin ON DELETE CASCADE, asi que se borra primero; y `project_members`
 * referencia `users`, asi que los proyectos van antes que los usuarios.
 */
export async function limpiarDatosDePrueba(): Promise<void> {
  await pool.query(`
    WITH proyectos AS (
      SELECT DISTINCT p.id_proyecto
      FROM projects p
      WHERE p.titulo LIKE 'TEST-%'
         OR p.id_proyecto IN (
              SELECT id_proyecto FROM project_members WHERE codigo_alumno LIKE '99%'
            )
    ),
    folios_borrados AS (
      DELETE FROM folios WHERE id_proyecto IN (SELECT id_proyecto FROM proyectos)
    )
    DELETE FROM projects WHERE id_proyecto IN (SELECT id_proyecto FROM proyectos)
  `);
  await pool.query(
    `DELETE FROM users WHERE codigo_cucei LIKE '99%' OR nombre LIKE 'TEST-%'`,
  );
}

export interface UsuariosDePrueba {
  ids: Record<string, number>;
  idOnboarding: number;
}

/** Siembra los usuarios de prueba y devuelve sus ids reales. */
export async function sembrarUsuarios(): Promise<UsuariosDePrueba> {
  await limpiarDatosDePrueba();

  const alumnos = [CODES.A1, CODES.A2, CODES.A3, CODES.A4, CODES.A5, CODES.A6, CODES.A7, CODES.A8];
  for (const [i, codigo] of alumnos.entries()) {
    await pool.query(
      `INSERT INTO users (codigo_cucei, nombre, rol) VALUES ($1, $2, 'alumno')`,
      [codigo, `TEST-Alumno A${i + 1}`],
    );
  }
  await pool.query(
    `INSERT INTO users (codigo_cucei, nombre, rol) VALUES ($1, 'TEST-Mentor M1', 'mentor')`,
    [CODES.M1],
  );
  await pool.query(
    `INSERT INTO users (codigo_cucei, nombre, rol) VALUES ($1, 'TEST-Mentor M2', 'mentor')`,
    [CODES.M2],
  );
  await pool.query(
    `INSERT INTO users (codigo_cucei, nombre, rol) VALUES ($1, 'TEST-Admin', 'admin')`,
    [CODES.AD],
  );
  // Alumno que aun no capturo su codigo CUCEI (primer login con Google).
  const onb = await pool.query<{ id: number }>(
    `INSERT INTO users (codigo_cucei, nombre, rol) VALUES (NULL, 'TEST-Alumno Onboarding', 'alumno') RETURNING id`,
  );

  // M1 con cupo 1 para poder probar el agotamiento de cupo; M2 con cupo normal.
  await pool.query(
    `INSERT INTO advisor_profiles (id_usuario, especialidad, disponible, cupo_maximo)
     SELECT id, 'TEST especialidad', true, 1 FROM users WHERE codigo_cucei = $1`,
    [CODES.M1],
  );
  await pool.query(
    `INSERT INTO advisor_profiles (id_usuario, especialidad, disponible, cupo_maximo)
     SELECT id, 'TEST especialidad', true, 3 FROM users WHERE codigo_cucei = $1`,
    [CODES.M2],
  );

  const res = await pool.query<{ id: number; codigo_cucei: string }>(
    `SELECT id, codigo_cucei FROM users WHERE codigo_cucei LIKE '99%'`,
  );
  const ids: Record<string, number> = {};
  for (const row of res.rows) ids[row.codigo_cucei] = row.id;

  return { ids, idOnboarding: onb.rows[0].id };
}

/** Lee una columna de un proyecto directo de la base, para asertar estado real. */
export async function columnaDeProyecto<T = unknown>(
  id_proyecto: number,
  columna: 'estado_actual' | 'pdf_visualizado' | 'id_mentor' | 'descripcion',
): Promise<T> {
  const res = await pool.query(
    `SELECT ${columna} AS valor FROM projects WHERE id_proyecto = $1`,
    [id_proyecto],
  );
  return res.rows[0]?.valor as T;
}

export async function cerrarPool(): Promise<void> {
  await pool.end();
}
