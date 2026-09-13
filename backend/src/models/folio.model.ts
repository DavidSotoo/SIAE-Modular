import pg from 'pg';
import pool from '../config/db.js';

export async function getNextFolioSequence(client?: pg.PoolClient): Promise<number> {
  const db = client || pool;
  const res = await db.query(`SELECT nextval('folio_counter_info') as seq`);
  return parseInt(res.rows[0].seq, 10);
}

export async function insertFolio(
  codigo_folio: string,
  id_proyecto: number,
  client?: pg.PoolClient
): Promise<void> {
  const db = client || pool;
  await db.query(
    `INSERT INTO folios (codigo_folio, id_proyecto) VALUES ($1, $2)`,
    [codigo_folio, id_proyecto]
  );
}

export async function getFolioByProjectId(
  id_proyecto: number,
  client?: pg.PoolClient
): Promise<string | null> {
  const db = client || pool;
  const res = await db.query(
    `SELECT codigo_folio FROM folios WHERE id_proyecto = $1`,
    [id_proyecto]
  );
  if (res.rows.length === 0) return null;
  return res.rows[0].codigo_folio;
}
