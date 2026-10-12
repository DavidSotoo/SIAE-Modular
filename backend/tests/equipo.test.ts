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

const MAX_INTEGRANTES = 5; // SM-40

describe('Equipo: crear proyecto, invitar, solicitar y limite de integrantes', () => {
  let ids: Record<string, number>;
  const t: Record<string, string> = {};
  let proyecto: number;

  beforeAll(async () => {
    ids = (await sembrarUsuarios()).ids;
    for (const k of ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'] as const) {
      t[k] = tokenFor(ids[CODES[k]], CODES[k], 'alumno');
    }
  });

  afterAll(async () => {
    await limpiarDatosDePrueba();
    await cerrarPool();
  });

  const crear = (token: string, body: Record<string, unknown>) =>
    request(app).post('/api/projects').set('Authorization', `Bearer ${token}`).send(body);

  describe('Validacion al crear', () => {
    it('exige descripcion', async () => {
      const res = await crear(t.A1, { titulo: 'TEST-Proyecto sin descripcion' });
      expect(res.status).toBe(400);
    });

    it('exige titulo', async () => {
      const res = await crear(t.A1, { titulo: '', descripcion: DESCRIPCION_VALIDA });
      expect(res.status).toBe(400);
    });

    it('IMF-02: rechaza un titulo de mas de 20 palabras', async () => {
      const res = await crear(t.A1, {
        titulo: 'TEST ' + 'palabra '.repeat(25),
        descripcion: DESCRIPCION_VALIDA,
      });
      expect(res.status).toBe(400);
    });

    it('acepta exactamente 20 palabras', async () => {
      const res = await crear(t.A7, {
        titulo: Array.from({ length: 20 }, (_, i) => `TEST${i}`).join(' '),
        descripcion: DESCRIPCION_VALIDA,
      });
      expect(res.status).toBe(201);
    });

    it('rechaza una descripcion de mas de 100 palabras', async () => {
      const res = await crear(t.A2, {
        titulo: 'TEST-Descripcion larga',
        descripcion: 'palabra '.repeat(120),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('Creacion y liderazgo', () => {
    it('crea el proyecto en estado borrador', async () => {
      const res = await crear(t.A1, {
        titulo: 'TEST-Integracion etapas 2 a 5',
        descripcion: DESCRIPCION_VALIDA,
      });
      expect(res.status).toBe(201);
      expect(res.body.estado_actual).toBe('borrador');
      proyecto = res.body.id_proyecto;
    });

    it('SM-40: marca como lider a quien lo crea', async () => {
      const res = await request(app)
        .get('/api/students/me/project')
        .set('Authorization', `Bearer ${t.A1}`);
      const lider = res.body.miembros.find((m: { codigo_cucei: string }) => m.codigo_cucei === CODES.A1);
      expect(lider?.es_lider).toBe(true);
    });

    it('impide tener dos proyectos activos', async () => {
      const res = await crear(t.A1, { titulo: 'TEST-Segundo', descripcion: DESCRIPCION_VALIDA });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('ALREADY_HAS_PROJECT');
    });
  });

  describe('Invitaciones y solicitudes', () => {
    const invitar = (token: string, codigo_alumno: string) =>
      request(app)
        .post(`/api/projects/${proyecto}/team-requests`)
        .set('Authorization', `Bearer ${token}`)
        .send({ codigo_alumno, tipo: 'invitacion' });

    it('impide invitar a quien no es miembro del proyecto', async () => {
      const res = await invitar(t.A3, CODES.A2);
      expect(res.status).toBe(403);
    });

    let invitacionA2: number;

    it('el lider puede invitar', async () => {
      const inv = await invitar(t.A1, CODES.A2);
      expect(inv.status).toBe(201);
      invitacionA2 = inv.body.id_solicitud;
    });

    it('rechaza una segunda invitacion al mismo alumno mientras sigue pendiente', async () => {
      const res = await invitar(t.A1, CODES.A2);
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('DUPLICATE_REQUEST');
    });

    it('el invitado acepta y se integra', async () => {
      const acc = await request(app)
        .post(`/api/team-requests/${invitacionA2}/accept`)
        .set('Authorization', `Bearer ${t.A2}`);
      expect(acc.status).toBe(200);
    });

    it('rechaza invitar a alguien que ya es integrante', async () => {
      const res = await invitar(t.A1, CODES.A2);
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('ALREADY_MEMBER');
    });

    it('un alumno externo solicita entrar y un miembro acepta', async () => {
      const sol = await request(app)
        .post(`/api/projects/${proyecto}/team-requests`)
        .set('Authorization', `Bearer ${t.A4}`)
        .send({ tipo: 'solicitud', mensaje: 'TEST solicitud' });
      expect(sol.status).toBe(201);

      const acc = await request(app)
        .post(`/api/team-requests/${sol.body.id_solicitud}/accept`)
        .set('Authorization', `Bearer ${t.A1}`);
      expect(acc.status).toBe(200);
    });
  });

  describe(`Limite de ${MAX_INTEGRANTES} integrantes (SM-40)`, () => {
    it('admite integrantes hasta el maximo', async () => {
      // A1 (lider), A2 y A4 ya estan dentro: faltan dos para llegar a 5.
      for (const k of ['A3', 'A5'] as const) {
        const inv = await request(app)
          .post(`/api/projects/${proyecto}/team-requests`)
          .set('Authorization', `Bearer ${t.A1}`)
          .send({ codigo_alumno: CODES[k], tipo: 'invitacion' });
        const id = inv.body.id_solicitud;
        const acc = await request(app)
          .post(`/api/team-requests/${id}/accept`)
          .set('Authorization', `Bearer ${t[k]}`);
        expect(acc.status).toBe(200);
      }

      const res = await request(app)
        .get('/api/students/me/project')
        .set('Authorization', `Bearer ${t.A1}`);
      expect(res.body.miembros).toHaveLength(MAX_INTEGRANTES);
    });

    it(`rechaza al integrante ${MAX_INTEGRANTES + 1}`, async () => {
      const res = await request(app)
        .post(`/api/projects/${proyecto}/team-requests`)
        .set('Authorization', `Bearer ${t.A1}`)
        .send({ codigo_alumno: CODES.A6, tipo: 'invitacion' });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('PROJECT_FULL');
    });
  });
});
