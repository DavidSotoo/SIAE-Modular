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
 * Invariante 7: cada rol solo entra a sus rutas. El sidebar las oculta, pero
 * quien llame la API directamente tambien debe recibir 403.
 */
describe('RBAC: bloqueo de rutas por rol', () => {
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

  describe('Rutas de administracion', () => {
    const rutas = ['/api/admin/projects', '/api/admin/stats', '/api/admin/export/csv'];

    it.each(rutas)('un alumno no accede a %s', async (ruta) => {
      const res = await request(app).get(ruta).set('Authorization', `Bearer ${alumno}`);
      expect(res.status).toBe(403);
    });

    it.each(rutas)('un mentor no accede a %s', async (ruta) => {
      const res = await request(app).get(ruta).set('Authorization', `Bearer ${mentor}`);
      expect(res.status).toBe(403);
    });

    it.each(rutas)('sin token, %s responde 401', async (ruta) => {
      const res = await request(app).get(ruta);
      expect(res.status).toBe(401);
    });
  });

  describe('Rutas de mentor', () => {
    it('un alumno no accede al panel de asesor', async () => {
      const res = await request(app)
        .get('/api/mentors/me/projects')
        .set('Authorization', `Bearer ${alumno}`);
      expect(res.status).toBe(403);
    });

    it('un admin tampoco accede al panel de asesor', async () => {
      const res = await request(app)
        .get('/api/mentors/me/projects')
        .set('Authorization', `Bearer ${admin}`);
      expect(res.status).toBe(403);
    });
  });

  describe('Rutas de alumno', () => {
    it('un mentor no puede crear proyectos', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${mentor}`)
        .send({ titulo: 'TEST-x', descripcion: DESCRIPCION_VALIDA });
      expect(res.status).toBe(403);
    });

    it('un admin no puede crear proyectos', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${admin}`)
        .send({ titulo: 'TEST-x', descripcion: DESCRIPCION_VALIDA });
      expect(res.status).toBe(403);
    });

    it('un mentor no accede a "mi proyecto"', async () => {
      const res = await request(app)
        .get('/api/students/me/project')
        .set('Authorization', `Bearer ${mentor}`);
      expect(res.status).toBe(403);
    });

    it('un admin no accede al perfil de alumno', async () => {
      const res = await request(app)
        .get('/api/students/me/profile')
        .set('Authorization', `Bearer ${admin}`);
      expect(res.status).toBe(403);
    });

    it('sin token no se puede crear un proyecto', async () => {
      const res = await request(app)
        .post('/api/projects')
        .send({ titulo: 'TEST-x', descripcion: DESCRIPCION_VALIDA });
      expect(res.status).toBe(401);
    });
  });
});
