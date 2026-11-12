import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import pool from '../src/config/db.js';
import { CODES, tokenFor, sembrarUsuarios, limpiarDatosDePrueba, cerrarPool } from './helpers.js';

/**
 * Regresión: guardar el perfil fallaba con 400 cuando el alumno tenía al menos
 * una soft skill. El formulario envía hard y soft skills en el mismo arreglo
 * `skills`, pero las soft no llevan `nivel`; el servicio las rechazaba. Ahora
 * el nivel es opcional (se normaliza a 'basico' al guardar). Estas pruebas
 * cubren ese contrato frontend↔backend que antes no tenía cobertura.
 */
describe('PUT /students/me/profile', () => {
  let alumno: string;
  let hardId: number;
  let softId: number;

  beforeAll(async () => {
    const ids = (await sembrarUsuarios()).ids;
    alumno = tokenFor(ids[CODES.A1], CODES.A1, 'alumno');

    // El catálogo no se siembra en CI; creamos skills propias y aisladas.
    const hard = await pool.query<{ id_skill: number }>(
      `INSERT INTO skills (nombre, tipo) VALUES ('TEST-Perfil Hard', 'hard')
       ON CONFLICT (nombre) DO UPDATE SET tipo = 'hard' RETURNING id_skill`,
    );
    const soft = await pool.query<{ id_skill: number }>(
      `INSERT INTO skills (nombre, tipo) VALUES ('TEST-Perfil Soft', 'soft')
       ON CONFLICT (nombre) DO UPDATE SET tipo = 'soft' RETURNING id_skill`,
    );
    hardId = hard.rows[0].id_skill;
    softId = soft.rows[0].id_skill;
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM skills WHERE nombre LIKE 'TEST-Perfil %'`);
    await limpiarDatosDePrueba();
    await cerrarPool();
  });

  it('guarda el perfil con una soft skill sin nivel (el caso que daba 400)', async () => {
    const res = await request(app)
      .put('/api/students/me/profile')
      .set('Authorization', `Bearer ${alumno}`)
      .send({
        disponibilidad: 'medio_tiempo',
        estado_busqueda: 'buscando_equipo',
        skills: [
          { id_skill: hardId, nivel: 'avanzado' },
          { id_skill: softId }, // soft skill sin nivel, igual que el formulario
        ],
        areas: [],
      });

    expect(res.status).toBe(200);
    const soft = res.body.skills.find((s: { id_skill: number }) => s.id_skill === softId);
    expect(soft, 'la soft skill debe quedar guardada').toBeTruthy();
    expect(soft.nivel).toBe('basico'); // normalizada
  });

  it('sigue rechazando con 400 un nivel inválido', async () => {
    const res = await request(app)
      .put('/api/students/me/profile')
      .set('Authorization', `Bearer ${alumno}`)
      .send({
        estado_busqueda: 'buscando_equipo',
        skills: [{ id_skill: hardId, nivel: 'experto_supremo' }],
        areas: [],
      });

    expect(res.status).toBe(400);
  });
});
