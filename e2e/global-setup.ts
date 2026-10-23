// Siembra la base antes de toda la corrida: borra los restos de corridas
// anteriores, crea los usuarios E2E y un proyecto en borrador, y firma un JWT
// por usuario. Las pruebas inyectan esa sesion en localStorage, igual que lo
// haria el login con Google.
import { writeFileSync } from 'node:fs';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import {
  ARCHIVO_SESIONES,
  E2E,
  FOTO_ROTA,
  TITULO_PROYECTO,
  USUARIOS,
  type ClaveUsuario,
} from './entorno.js';

export interface Sesion {
  token: string;
  user: { id: number; codigo_cucei: string | null; rol: string };
}

async function limpiar(db: pg.Client): Promise<void> {
  // folios referencia projects sin ON DELETE CASCADE, y project_members
  // referencia users: primero folios, luego proyectos, al final usuarios.
  await db.query(`
    WITH proyectos AS (
      SELECT DISTINCT p.id_proyecto
      FROM projects p
      WHERE p.titulo LIKE 'E2E-%'
         OR p.id_proyecto IN (
              SELECT id_proyecto FROM project_members WHERE codigo_alumno LIKE '98%'
            )
    ),
    folios_borrados AS (
      DELETE FROM folios WHERE id_proyecto IN (SELECT id_proyecto FROM proyectos)
    )
    DELETE FROM projects WHERE id_proyecto IN (SELECT id_proyecto FROM proyectos)
  `);
  await db.query(`DELETE FROM users WHERE codigo_cucei LIKE '98%' OR nombre LIKE 'E2E-%'`);
}

export default async function globalSetup(): Promise<void> {
  const db = new pg.Client({ connectionString: E2E.databaseUrl });
  await db.connect();
  try {
    await limpiar(db);

    const sesiones = {} as Record<ClaveUsuario, Sesion>;
    for (const [clave, u] of Object.entries(USUARIOS) as [
      ClaveUsuario,
      (typeof USUARIOS)[ClaveUsuario],
    ][]) {
      const res = await db.query<{ id: number }>(
        `INSERT INTO users (codigo_cucei, nombre, rol) VALUES ($1, $2, $3) RETURNING id`,
        [u.codigo, u.nombre, u.rol],
      );
      const user = { id: res.rows[0].id, codigo_cucei: u.codigo, rol: u.rol };
      const token = jwt.sign(user, E2E.jwtSecret, { expiresIn: '2h' });
      sesiones[clave] = { token, user };
    }

    await db.query(
      `INSERT INTO advisor_profiles (id_usuario, especialidad, disponible, cupo_maximo)
       VALUES ($1, 'Sistemas embebidos', true, 3)`,
      [sesiones.mentor.user.id],
    );

    // Foto de perfil que nunca carga (las pruebas responden 404): ejercita el
    // respaldo a iniciales sin manejadores onerror en linea.
    await db.query(`UPDATE users SET foto_url = $1 WHERE id = $2`, [
      FOTO_ROTA,
      sesiones.alumnoSinProyecto.user.id,
    ]);

    const proyecto = await db.query<{ id_proyecto: number }>(
      `INSERT INTO projects (titulo, descripcion)
       VALUES ($1, 'Proyecto sembrado para las pruebas de interfaz.')
       RETURNING id_proyecto`,
      [TITULO_PROYECTO],
    );
    await db.query(
      `INSERT INTO project_members (id_proyecto, codigo_alumno, es_lider) VALUES ($1, $2, true)`,
      [proyecto.rows[0].id_proyecto, USUARIOS.alumnaConProyecto.codigo],
    );

    writeFileSync(ARCHIVO_SESIONES, JSON.stringify(sesiones, null, 2));
  } finally {
    await db.end();
  }
}
