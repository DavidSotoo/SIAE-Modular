import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { CODES, tokenFor, sembrarUsuarios, limpiarDatosDePrueba, cerrarPool } from './helpers.js';

describe('Autenticacion, onboarding y perfil', () => {
  let ids: Record<string, number>;
  let idOnboarding: number;
  let alumno: string;
  let mentor: string;
  let admin: string;
  let sinOnboarding: string;

  beforeAll(async () => {
    const seed = await sembrarUsuarios();
    ids = seed.ids;
    idOnboarding = seed.idOnboarding;
    alumno = tokenFor(ids[CODES.A1], CODES.A1, 'alumno');
    mentor = tokenFor(ids[CODES.M1], CODES.M1, 'mentor');
    admin = tokenFor(ids[CODES.AD], CODES.AD, 'admin');
    sinOnboarding = tokenFor(idOnboarding, null, 'alumno');
  });

  afterAll(async () => {
    await limpiarDatosDePrueba();
    await cerrarPool();
  });

  describe('POST /api/auth/google', () => {
    it('rechaza la peticion sin id_token', async () => {
      const res = await request(app).post('/api/auth/google').send({});
      expect(res.status).toBe(400);
    });

    it('rechaza un id_token invalido', async () => {
      const res = await request(app).post('/api/auth/google').send({ id_token: 'xx.yy.zz' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('exige token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('rechaza una firma invalida', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${alumno.slice(0, -4)}AAAA`);
      expect(res.status).toBe(401);
    });

    it('devuelve nombre y rol del alumno', async () => {
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${alumno}`);
      expect(res.status).toBe(200);
      expect(res.body.rol).toBe('alumno');
      expect(res.body.nombre).toBe('TEST-Alumno A1');
    });

    it('devuelve el rol mentor', async () => {
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${mentor}`);
      expect(res.body.rol).toBe('mentor');
    });

    it('devuelve el rol admin', async () => {
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${admin}`);
      expect(res.body.rol).toBe('admin');
    });
  });

  describe('POST /api/auth/complete-profile (onboarding)', () => {
    it('rechaza un codigo de 8 digitos', async () => {
      const res = await request(app)
        .post('/api/auth/complete-profile')
        .set('Authorization', `Bearer ${sinOnboarding}`)
        .send({ codigo_cucei: '12345678' });
      expect(res.status).toBe(400);
    });

    it('rechaza un codigo no numerico', async () => {
      const res = await request(app)
        .post('/api/auth/complete-profile')
        .set('Authorization', `Bearer ${sinOnboarding}`)
        .send({ codigo_cucei: 'ABCDEFGHI' });
      expect(res.status).toBe(400);
    });

    it('rechaza un codigo que ya pertenece a otro usuario', async () => {
      const res = await request(app)
        .post('/api/auth/complete-profile')
        .set('Authorization', `Bearer ${sinOnboarding}`)
        .send({ codigo_cucei: CODES.A1 });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('CODIGO_TAKEN');
    });

    it('solo lo puede usar un alumno, no un mentor', async () => {
      const res = await request(app)
        .post('/api/auth/complete-profile')
        .set('Authorization', `Bearer ${mentor}`)
        .send({ codigo_cucei: '990000999' });
      expect(res.status).toBe(403);
    });

    it('acepta un codigo valido y queda reflejado en /auth/me', async () => {
      const res = await request(app)
        .post('/api/auth/complete-profile')
        .set('Authorization', `Bearer ${sinOnboarding}`)
        .send({ codigo_cucei: CODES.ONB_NUEVO });
      expect(res.status).toBe(200);

      const me = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${sinOnboarding}`);
      expect(me.body.codigo_cucei).toBe(CODES.ONB_NUEVO);
    });
  });

  describe('Perfil de alumno', () => {
    it('devuelve el perfil del alumno autenticado', async () => {
      const res = await request(app)
        .get('/api/students/me/profile')
        .set('Authorization', `Bearer ${alumno}`);
      expect(res.status).toBe(200);
      expect(res.body.nombre).toBe('TEST-Alumno A1');
    });

    it('guarda los cambios del perfil', async () => {
      const res = await request(app)
        .put('/api/students/me/profile')
        .set('Authorization', `Bearer ${alumno}`)
        .send({
          semestre: 6,
          bio: 'TEST bio',
          estado_busqueda: 'buscando_equipo',
          skills: [],
          areas: [],
        });
      expect(res.status).toBe(200);
      expect(res.body.semestre).toBe(6);
    });

    it('rechaza un semestre fuera de rango', async () => {
      const res = await request(app)
        .put('/api/students/me/profile')
        .set('Authorization', `Bearer ${alumno}`)
        .send({ semestre: 13 });
      expect(res.status).toBe(400);
    });

    it('no es accesible para un mentor', async () => {
      const res = await request(app)
        .get('/api/students/me/profile')
        .set('Authorization', `Bearer ${mentor}`);
      expect(res.status).toBe(403);
    });

    it('bloquea al alumno que aun no completa su codigo CUCEI', async () => {
      const token = tokenFor(idOnboarding, null, 'alumno');
      const res = await request(app)
        .get('/api/students/me/project')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ONBOARDING_REQUIRED');
    });
  });
});
