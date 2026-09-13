import pool from '../config/db.js';

export interface Skill {
  id_skill: number;
  nombre: string;
  tipo: 'hard' | 'soft';
}

export interface Area {
  id_area: number;
  nombre: string;
}

export async function findAllSkills(): Promise<Skill[]> {
  const result = await pool.query<Skill>(
    `SELECT id_skill, nombre, tipo
     FROM skills
     ORDER BY tipo, nombre`,
  );
  return result.rows;
}

export async function findAllAreas(): Promise<Area[]> {
  const result = await pool.query<Area>(
    `SELECT id_area, nombre
     FROM areas_interes
     ORDER BY nombre`,
  );
  return result.rows;
}

export async function createSkill(nombre: string, tipo: 'hard' | 'soft'): Promise<Skill> {
  const result = await pool.query<Skill>(
    `INSERT INTO skills (nombre, tipo) VALUES ($1, $2) RETURNING id_skill, nombre, tipo`,
    [nombre, tipo]
  );
  return result.rows[0];
}
