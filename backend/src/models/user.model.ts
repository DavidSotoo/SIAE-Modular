import pool from '../config/db.js';

export type Rol = 'alumno' | 'mentor' | 'admin';

export interface UserRow {
  id: number;
  codigo_cucei: string | null;
  nombre: string;
  email: string | null;
  google_sub: string | null;
  foto_url: string | null;
  rol: Rol;
  created_at: string;
}

export async function findUserById(id: number): Promise<UserRow | null> {
  const res = await pool.query<UserRow>(`SELECT * FROM users WHERE id = $1`, [id]);
  return res.rows[0] ?? null;
}

export async function findUserByGoogleSub(google_sub: string): Promise<UserRow | null> {
  const res = await pool.query<UserRow>(`SELECT * FROM users WHERE google_sub = $1`, [google_sub]);
  return res.rows[0] ?? null;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const res = await pool.query<UserRow>(`SELECT * FROM users WHERE email = $1`, [email]);
  return res.rows[0] ?? null;
}

export async function createGoogleUser(data: {
  nombre: string;
  email: string;
  google_sub: string;
  foto_url: string | null;
  rol: Rol;
}): Promise<UserRow> {
  const res = await pool.query<UserRow>(
    `INSERT INTO users (nombre, email, google_sub, foto_url, rol)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.nombre, data.email, data.google_sub, data.foto_url, data.rol],
  );
  return res.rows[0];
}

/** Vincula google_sub a una cuenta que ya existía solo con email (no debería pasar en flujo normal, pero cubre el caso). */
export async function linkGoogleSub(id_usuario: number, google_sub: string): Promise<void> {
  await pool.query(`UPDATE users SET google_sub = $1 WHERE id = $2`, [google_sub, id_usuario]);
}

/** Actualiza la foto de perfil desde el token de Google (puede cambiar entre logins). */
export async function updateUserFotoUrl(id_usuario: number, foto_url: string | null): Promise<void> {
  await pool.query(`UPDATE users SET foto_url = $1 WHERE id = $2`, [foto_url, id_usuario]);
}

export async function isCodigoCuceiTaken(codigo_cucei: string): Promise<boolean> {
  const res = await pool.query(`SELECT 1 FROM users WHERE codigo_cucei = $1`, [codigo_cucei]);
  return (res.rowCount ?? 0) > 0;
}

export async function setUserCodigoCucei(id_usuario: number, codigo_cucei: string): Promise<void> {
  await pool.query(`UPDATE users SET codigo_cucei = $1 WHERE id = $2`, [codigo_cucei, id_usuario]);
}
