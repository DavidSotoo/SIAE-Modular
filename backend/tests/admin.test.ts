import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import {
  CODES,
  DESCRIPCION_VALIDA,
  PDF_BYTES,
  tokenFor,
  sembrarUsuarios,
  limpiarDatosDePrueba,
  cerrarPool,
} from './helpers.js';

describe('Panel administrativo', () => {
  let ids: Record<string, number>;
  let admin: string;
  let proyecto: number;
  let folio: string;

  beforeAll(async () => {
    ids = (await sembrarUsuarios()).ids;
    admin = tokenFor(ids[CODES.AD], CODES.AD, 'admin');
    const alumno = tokenFor(ids[CODES.A1], CODES.A1, 'alumno');
    const mentor = tokenFor(ids[CODES.M1], CODES.M1, 'mentor');

    // Un proyecto llevado hasta "registrado" para que haya folio que exportar.
    const creado = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${alumno}`)
      .send({ titulo: 'TEST-Proyecto para panel admin', descripcion: DESCRIPCION_VALIDA });
    proyecto = creado.body.id_proyecto;

    await request(app)
      .post(`/api/projects/${proyecto}/protocol`)
      .set('Authorization', `Bearer ${alumno}`)
      .attach('file', PDF_BYTES, { filename: 'p.pdf', contentType: 'application/pdf' });

    const sol = await request(app)
      .post(`/api/projects/${proyecto}/advisor-requests`)
      .set('Authorization', `Bearer ${alumno}`)
      .send({ id_mentor: ids[CODES.M1] });
    await request(app)
      .post(`/api/advisor-requests/${sol.body.id_solicitud}/accept`)
      .set('Authorization', `Bearer ${mentor}`);

    await request(app)
      .get(`/api/projects/${proyecto}/protocol`)
      .set('Authorization', `Bearer ${mentor}`);
    await request(app)
      .post(`/api/projects/${proyecto}/validate`)
      .set('Authorization', `Bearer ${mentor}`);
    const reg = await request(app)
      .post(`/api/projects/${proyecto}/register`)
      .set('Authorization', `Bearer ${admin}`);
    folio = reg.body.codigo_folio;
  });

  afterAll(async () => {
    await limpiarDatosDePrueba();
    await cerrarPool();
  });

  it('lista los proyectos e incluye el recien registrado', async () => {
    const res = await request(app).get('/api/admin/projects').set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(200);
    expect(res.body.some((p: { id_proyecto: number }) => p.id_proyecto === proyecto)).toBe(true);
  });

  it('devuelve estadisticas con total y desglose por estado', async () => {
    const res = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.total_proyectos).toBe('number');
    expect(res.body.por_estado).toBeTruthy();
    expect(res.body.total_folios).toBeGreaterThanOrEqual(1);
  });

  it('devuelve el detalle del proyecto con su historial', async () => {
    const res = await request(app)
      .get(`/api/admin/projects/${proyecto}`)
      .set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(200);
    const historial = res.body.historial ?? res.body.history;
    expect(Array.isArray(historial)).toBe(true);
    expect(historial.length).toBeGreaterThan(0);
  });

  it('exporta CSV con encabezados y el folio emitido', async () => {
    const res = await request(app)
      .get('/api/admin/export/csv')
      .set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text).toContain('Folio');
    expect(res.text).toContain(folio);
  });

  it('exporta un Excel valido', async () => {
    const res = await request(app)
      .get('/api/admin/export/xlsx')
      .set('Authorization', `Bearer ${admin}`)
      .buffer(true)
      .parse((r, cb) => {
        const trozos: Buffer[] = [];
        r.on('data', (c: Buffer) => trozos.push(c));
        r.on('end', () => cb(null, Buffer.concat(trozos)));
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/spreadsheetml/);
    // Un .xlsx es un ZIP: debe empezar con la firma PK.
    expect((res.body as Buffer).subarray(0, 2).toString()).toBe('PK');
  });
});
