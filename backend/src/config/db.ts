import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// Postgres gestionado (Neon) exige TLS; el de docker-compose en local no lo
// tiene configurado. Se decide por el host en vez de confiar en que pg
// interprete el sslmode de la cadena, que varia entre versiones.
const urlDb = process.env.DATABASE_URL ?? '';
const esLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(urlDb);

const pool = new Pool({
  connectionString: urlDb,
  ssl: esLocal ? undefined : { rejectUnauthorized: true },
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Ejecuta una función dentro de una transacción.
 * Hace ROLLBACK automático en caso de error y libera el cliente.
 */
export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export default pool;
