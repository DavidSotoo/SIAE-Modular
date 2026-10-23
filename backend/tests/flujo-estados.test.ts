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
  columnaDeProyecto,
  cerrarPool,
} from './helpers.js';

/**
 * Recorre el motor de estados completo con los 3 roles:
 *   borrador -> pendiente -> correccion -> pendiente -> validado -> registrado
 * y fija los invariantes IMF-03 (no validar sin abrir el PDF) e IMF-05
 * (el historial guarda el estado_anterior real).
 */
describe('Motor de estados: asesoria, protocolo, validacion y folio', () => {
  let ids: Record<string, number>;
  let alumno: string;
  let alumnoAjeno: string;
  let alumnoCupo: string;
  let mentor: string;
  let mentorAjeno: string;
  let admin: string;
  let proyecto: number;
  let proyectoSinValidar: number;
  let folioEmitido: string | undefined;

  beforeAll(async () => {
    ids = (await sembrarUsuarios()).ids;
    alumno = tokenFor(ids[CODES.A1], CODES.A1, 'alumno');
    alumnoAjeno = tokenFor(ids[CODES.A7], CODES.A7, 'alumno');
    alumnoCupo = tokenFor(ids[CODES.A8], CODES.A8, 'alumno');
    mentor = tokenFor(ids[CODES.M1], CODES.M1, 'mentor');
    mentorAjeno = tokenFor(ids[CODES.M2], CODES.M2, 'mentor');
    admin = tokenFor(ids[CODES.AD], CODES.AD, 'admin');

    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${alumno}`)
      .send({ titulo: 'TEST-Flujo completo', descripcion: DESCRIPCION_VALIDA });
    proyecto = res.body.id_proyecto;
  });

  afterAll(async () => {
    await limpiarDatosDePrueba();
    await cerrarPool();
  });

  const subirPdf = (
    id: number,
    token: string,
    bytes: Buffer = PDF_BYTES,
    nombre = 'protocolo.pdf',
  ) =>
    request(app)
      .post(`/api/projects/${id}/protocol`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', bytes, { filename: nombre, contentType: 'application/pdf' });

  describe('Asignacion de asesor', () => {
    let solicitud: number;

    it('el alumno solicita asesoria', async () => {
      const res = await request(app)
        .post(`/api/projects/${proyecto}/advisor-requests`)
        .set('Authorization', `Bearer ${alumno}`)
        .send({ id_mentor: ids[CODES.M1], mensaje: 'TEST asesoria' });
      expect(res.status).toBe(201);
      solicitud = res.body.id_solicitud;
    });

    it('rechaza una solicitud duplicada al mismo mentor', async () => {
      const res = await request(app)
        .post(`/api/projects/${proyecto}/advisor-requests`)
        .set('Authorization', `Bearer ${alumno}`)
        .send({ id_mentor: ids[CODES.M1] });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('DUPLICATE_ADVISOR_REQUEST');
    });

    it('un alumno no puede aceptar una solicitud de asesoria', async () => {
      const res = await request(app)
        .post(`/api/advisor-requests/${solicitud}/accept`)
        .set('Authorization', `Bearer ${alumno}`);
      expect(res.status).toBe(403);
    });

    it('otro mentor no puede aceptar una solicitud ajena', async () => {
      const res = await request(app)
        .post(`/api/advisor-requests/${solicitud}/accept`)
        .set('Authorization', `Bearer ${mentorAjeno}`);
      expect(res.status).toBe(403);
    });

    it('SM-59: el mentor destinatario la acepta sin error 500', async () => {
      const res = await request(app)
        .post(`/api/advisor-requests/${solicitud}/accept`)
        .set('Authorization', `Bearer ${mentor}`);
      expect(res.status).toBe(200);
      expect(await columnaDeProyecto<number>(proyecto, 'id_mentor')).toBe(ids[CODES.M1]);
    });

    it('rechaza una nueva solicitud si el proyecto ya tiene asesor', async () => {
      const res = await request(app)
        .post(`/api/projects/${proyecto}/advisor-requests`)
        .set('Authorization', `Bearer ${alumno}`)
        .send({ id_mentor: ids[CODES.M2] });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('ALREADY_HAS_MENTOR');
    });

    it('respeta el cupo del mentor', async () => {
      const nuevo = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${alumnoCupo}`)
        .send({ titulo: 'TEST-Proyecto para probar cupo', descripcion: DESCRIPCION_VALIDA });
      proyectoSinValidar = nuevo.body.id_proyecto;

      // M1 tiene cupo_maximo = 1 y ya lo ocupo con el proyecto anterior.
      const res = await request(app)
        .post(`/api/projects/${proyectoSinValidar}/advisor-requests`)
        .set('Authorization', `Bearer ${alumnoCupo}`)
        .send({ id_mentor: ids[CODES.M1] });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('ADVISOR_NO_CUPO');
    });
  });

  describe('Protocolo: subir, rechazar y reenviar', () => {
    it('rechaza un archivo que no es PDF', async () => {
      const res = await request(app)
        .post(`/api/projects/${proyecto}/protocol`)
        .set('Authorization', `Bearer ${alumno}`)
        .attach('file', Buffer.from('no soy pdf'), {
          filename: 'nota.txt',
          contentType: 'text/plain',
        });
      expect(res.status).toBe(400);
    });

    it('rechaza un binario disfrazado de PDF por su mimetype', async () => {
      const res = await subirPdf(
        proyecto,
        alumno,
        Buffer.from('MZ\x90\x00ejecutable'),
        'falso.pdf',
      );
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/no es un PDF/i);
    });

    it('rechaza a un alumno ajeno al proyecto', async () => {
      const res = await subirPdf(proyecto, alumnoAjeno);
      expect(res.status).toBe(403);
    });

    it('acepta el PDF y pasa el proyecto a pendiente', async () => {
      const res = await subirPdf(proyecto, alumno);
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      expect(await columnaDeProyecto(proyecto, 'estado_actual')).toBe('pendiente');
    });

    it('IMF-03: al subir, pdf_visualizado queda en false', async () => {
      expect(await columnaDeProyecto(proyecto, 'pdf_visualizado')).toBe(false);
    });

    it('exige comentario para rechazar', async () => {
      const res = await request(app)
        .post(`/api/projects/${proyecto}/reject`)
        .set('Authorization', `Bearer ${mentor}`)
        .send({ comentario: '' });
      expect(res.status).toBe(400);
    });

    it('solo el mentor asignado puede rechazar', async () => {
      const res = await request(app)
        .post(`/api/projects/${proyecto}/reject`)
        .set('Authorization', `Bearer ${mentorAjeno}`)
        .send({ comentario: 'TEST' });
      expect(res.status).toBe(403);
    });

    it('el rechazo deja el proyecto en correccion', async () => {
      const res = await request(app)
        .post(`/api/projects/${proyecto}/reject`)
        .set('Authorization', `Bearer ${mentor}`)
        .send({ comentario: 'TEST falta marco teorico' });
      expect(res.status).toBe(200);
      expect(await columnaDeProyecto(proyecto, 'estado_actual')).toBe('correccion');
    });

    it('el reenvio vuelve a dejarlo pendiente', async () => {
      const res = await subirPdf(proyecto, alumno);
      expect(res.status).toBeLessThan(300);
      expect(await columnaDeProyecto(proyecto, 'estado_actual')).toBe('pendiente');
    });

    it('IMF-03: el reenvio reinicia pdf_visualizado a false', async () => {
      expect(await columnaDeProyecto(proyecto, 'pdf_visualizado')).toBe(false);
    });
  });

  describe('Validacion del mentor (IMF-03)', () => {
    it('IMF-03: no permite validar sin haber abierto el PDF', async () => {
      const res = await request(app)
        .post(`/api/projects/${proyecto}/validate`)
        .set('Authorization', `Bearer ${mentor}`);
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('PDF_NOT_VIEWED');
      expect(await columnaDeProyecto(proyecto, 'estado_actual')).toBe('pendiente');
    });

    it('un alumno no puede validar', async () => {
      const res = await request(app)
        .post(`/api/projects/${proyecto}/validate`)
        .set('Authorization', `Bearer ${alumno}`);
      expect(res.status).toBe(403);
    });

    it('el mentor asignado descarga el protocolo y recibe un PDF', async () => {
      const res = await request(app)
        .get(`/api/projects/${proyecto}/protocol`)
        .set('Authorization', `Bearer ${mentor}`)
        .buffer(true)
        .parse((res, cb) => {
          const trozos: Buffer[] = [];
          res.on('data', (c: Buffer) => trozos.push(c));
          res.on('end', () => cb(null, Buffer.concat(trozos)));
        });
      expect(res.status).toBe(200);
      expect((res.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
    });

    it('IMF-03: abrir el PDF marca pdf_visualizado en true', async () => {
      expect(await columnaDeProyecto(proyecto, 'pdf_visualizado')).toBe(true);
    });

    it('un mentor no asignado no puede validar', async () => {
      const res = await request(app)
        .post(`/api/projects/${proyecto}/validate`)
        .set('Authorization', `Bearer ${mentorAjeno}`);
      expect(res.status).toBe(403);
    });

    it('el mentor asignado valida tras abrir el PDF', async () => {
      const res = await request(app)
        .post(`/api/projects/${proyecto}/validate`)
        .set('Authorization', `Bearer ${mentor}`);
      expect(res.status).toBe(200);
      expect(await columnaDeProyecto(proyecto, 'estado_actual')).toBe('validado');
    });
  });

  describe('Registro y emision de folio (solo admin)', () => {
    it('un mentor no puede emitir folio', async () => {
      const res = await request(app)
        .post(`/api/projects/${proyecto}/register`)
        .set('Authorization', `Bearer ${mentor}`);
      expect(res.status).toBe(403);
    });

    it('un alumno no puede emitir folio', async () => {
      const res = await request(app)
        .post(`/api/projects/${proyecto}/register`)
        .set('Authorization', `Bearer ${alumno}`);
      expect(res.status).toBe(403);
    });

    it('no permite registrar un proyecto que no esta validado', async () => {
      const res = await request(app)
        .post(`/api/projects/${proyectoSinValidar}/register`)
        .set('Authorization', `Bearer ${admin}`);
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });

    it('el admin registra y emite el folio', async () => {
      const res = await request(app)
        .post(`/api/projects/${proyecto}/register`)
        .set('Authorization', `Bearer ${admin}`);
      expect(res.status).toBe(200);
      expect(res.body.codigo_folio).toBeTruthy();
      folioEmitido = res.body.codigo_folio;
      expect(await columnaDeProyecto(proyecto, 'estado_actual')).toBe('registrado');
    });

    it('no permite emitir el folio dos veces', async () => {
      const res = await request(app)
        .post(`/api/projects/${proyecto}/register`)
        .set('Authorization', `Bearer ${admin}`);
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
      expect(folioEmitido).toBeTruthy();
    });
  });

  describe('Historial y permisos (IMF-05)', () => {
    const historial = (token: string) =>
      request(app).get(`/api/projects/${proyecto}/history`).set('Authorization', `Bearer ${token}`);

    it('un integrante ve las 5 transiciones del flujo', async () => {
      const res = await historial(alumno);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(5);
    });

    it('IMF-05: registra borrador -> pendiente', async () => {
      const res = await historial(alumno);
      expect(res.body).toContainEqual(
        expect.objectContaining({ estado_anterior: 'borrador', estado_nuevo: 'pendiente' }),
      );
    });

    it('IMF-05: el reenvio registra correccion -> pendiente, no un null fijo', async () => {
      const res = await historial(alumno);
      expect(res.body).toContainEqual(
        expect.objectContaining({ estado_anterior: 'correccion', estado_nuevo: 'pendiente' }),
      );
    });

    it('llega ordenado del mas reciente al mas antiguo', async () => {
      const res = await historial(alumno);
      expect(res.body[0].estado_nuevo).toBe('registrado');
      expect(res.body[res.body.length - 1].estado_anterior).toBe('borrador');
    });

    it('lo ve el mentor asignado', async () => {
      expect((await historial(mentor)).status).toBe(200);
    });

    it('lo ve el admin', async () => {
      expect((await historial(admin)).status).toBe(200);
    });

    it('lo niega a un alumno ajeno', async () => {
      expect((await historial(alumnoAjeno)).status).toBe(403);
    });

    it('lo niega a un mentor no asignado', async () => {
      expect((await historial(mentorAjeno)).status).toBe(403);
    });

    it('exige autenticacion', async () => {
      const res = await request(app).get(`/api/projects/${proyecto}/history`);
      expect(res.status).toBe(401);
    });
  });
});
