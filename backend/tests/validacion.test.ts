import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import {
  CODES,
  DESCRIPCION_VALIDA,
  tokenFor,
  sembrarUsuarios,
  limpiarDatosDePrueba,
  cerrarPool,
} from './helpers.js';

/**
 * A5: antes, un :id no numerico se convertia en NaN y llegaba hasta Postgres,
 * que respondia con el error 22P02 y la API devolvia un 500. Ahora se corta
 * en el borde con un 400 y el codigo VALIDATION_ERROR.
 */
describe('Validacion de entrada con esquemas', () => {
  let alumno: string;
  let mentor: string;
  let admin: string;

  beforeAll(async () => {
    const ids = (await sembrarUsuarios()).ids;
    alumno = tokenFor(ids[CODES.A1], CODES.A1, 'alumno');
    mentor = tokenFor(ids[CODES.M1], CODES.M1, 'mentor');
    admin = tokenFor(ids[CODES.AD], CODES.AD, 'admin');
  });

  afterAll(async () => {
    await limpiarDatosDePrueba();
    await cerrarPool();
  });

  describe('Parametros de ruta no numericos', () => {
    const casos: Array<[string, string, 'get' | 'post', () => string]> = [
      ['historial', '/api/projects/abc/history', 'get', () => alumno],
      ['descarga de protocolo', '/api/projects/abc/protocol', 'get', () => alumno],
      ['validacion', '/api/projects/abc/validate', 'post', () => mentor],
      ['registro', '/api/projects/abc/register', 'post', () => admin],
      ['detalle admin', '/api/admin/projects/abc', 'get', () => admin],
      ['aceptar solicitud de equipo', '/api/team-requests/abc/accept', 'post', () => alumno],
      ['aceptar asesoria', '/api/advisor-requests/abc/accept', 'post', () => mentor],
      ['perfil de asesor', '/api/advisors/abc', 'get', () => alumno],
    ];

    it.each(casos)('%s responde 400, no 500', async (_nombre, ruta, metodo, token) => {
      const res = await request(app)[metodo](ruta).set('Authorization', `Bearer ${token()}`);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('tambien rechaza un id negativo', async () => {
      const res = await request(app)
        .get('/api/projects/-1/history')
        .set('Authorization', `Bearer ${alumno}`);
      expect(res.status).toBe(400);
    });

    it('tambien rechaza un id decimal', async () => {
      const res = await request(app)
        .get('/api/projects/1.5/history')
        .set('Authorization', `Bearer ${alumno}`);
      expect(res.status).toBe(400);
    });

    it('un id valido pero inexistente sigue dando 403/404, no 400', async () => {
      const res = await request(app)
        .get('/api/projects/999999/history')
        .set('Authorization', `Bearer ${alumno}`);
      expect([403, 404]).toContain(res.status);
    });
  });

  describe('Cuerpo de la peticion', () => {
    it('rechaza crear un proyecto sin los campos esperados', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${alumno}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('rechaza un titulo que no es texto', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${alumno}`)
        .send({ titulo: 12345, descripcion: DESCRIPCION_VALIDA });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('rechaza un titulo desmedido antes de tocar la base', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${alumno}`)
        .send({ titulo: 'a'.repeat(5000), descripcion: DESCRIPCION_VALIDA });
      expect(res.status).toBe(400);
    });
  });
});
