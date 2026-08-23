import 'dotenv/config';
import pg from 'pg';
import bcrypt from 'bcrypt';

const pool = new pg.Pool({ connectionString: 'postgresql://siae_admin:siae_dev_password@127.0.0.1:5432/siae_modular' });

async function run() {
  try {
    console.log('Creating test users...');
    const hash = await bcrypt.hash('Test1234', 10);
    
    // Alumno 1
    await pool.query(`
      INSERT INTO users (codigo_cucei, password_hash, rol, nombre)
      VALUES ('220000001', $1, 'alumno', 'Alumno de Prueba 1')
      ON CONFLICT (codigo_cucei) DO UPDATE SET password_hash = $1
    `, [hash]);
    const u1 = await pool.query("SELECT id FROM users WHERE codigo_cucei = '220000001'");
    await pool.query(`
      INSERT INTO student_profiles (id_usuario, semestre, estado_busqueda, updated_at)
      VALUES ($1, 6, 'buscando_equipo', now())
      ON CONFLICT DO NOTHING
    `, [u1.rows[0].id]);

    // Alumno 2
    await pool.query(`
      INSERT INTO users (codigo_cucei, password_hash, rol, nombre)
      VALUES ('220000002', $1, 'alumno', 'Alumno de Prueba 2')
      ON CONFLICT (codigo_cucei) DO UPDATE SET password_hash = $1
    `, [hash]);
    const u2 = await pool.query("SELECT id FROM users WHERE codigo_cucei = '220000002'");
    await pool.query(`
      INSERT INTO student_profiles (id_usuario, semestre, estado_busqueda, updated_at)
      VALUES ($1, 7, 'buscando_equipo', now())
      ON CONFLICT DO NOTHING
    `, [u2.rows[0].id]);

    // Mentor 1
    await pool.query(`
      INSERT INTO users (codigo_cucei, password_hash, rol, nombre)
      VALUES ('mentor1', $1, 'mentor', 'Mentor de Prueba 1')
      ON CONFLICT (codigo_cucei) DO UPDATE SET password_hash = $1
    `, [hash]);
    const u3 = await pool.query("SELECT id FROM users WHERE codigo_cucei = 'mentor1'");
    await pool.query(`
      INSERT INTO advisor_profiles (id_usuario, disponible, cupo_maximo, acepta_coasesoria)
      VALUES ($1, true, 3, true)
      ON CONFLICT DO NOTHING
    `, [u3.rows[0].id]);

    console.log('Users created!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();