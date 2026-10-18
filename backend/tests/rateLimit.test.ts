import { describe, it, expect } from 'vitest';
import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { crearLimitador } from '../src/middleware/rateLimit.js';
import { AppError } from '../src/utils/errors.js';

/**
 * A2: el limitador real se desactiva bajo NODE_ENV=test, porque la suite
 * lanza cientos de peticiones desde la misma IP. Aqui se monta una app
 * minima con un tope bajo para comprobar el comportamiento de verdad.
 */
function appDePrueba(maximo: number) {
  const app = express();
  app.use(
    crearLimitador({
      ventanaMs: 60_000,
      maximo,
      mensaje: 'Demasiadas peticiones. Intenta de nuevo en unos minutos.',
      codigo: 'RATE_LIMITED',
    }),
  );
  app.get('/ping', (_req, res) => res.json({ ok: true }));
  // Mismo manejador de errores que la app real, para asertar la forma.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  });
  return app;
}

describe('Limite de peticiones por IP', () => {
  it('deja pasar las peticiones dentro del tope', async () => {
    const app = appDePrueba(3);
    for (let i = 0; i < 3; i++) {
      expect((await request(app).get('/ping')).status).toBe(200);
    }
  });

  it('responde 429 al superar el tope', async () => {
    const app = appDePrueba(2);
    await request(app).get('/ping');
    await request(app).get('/ping');

    const res = await request(app).get('/ping');
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('RATE_LIMITED');
    expect(res.body.error).toMatch(/Demasiadas peticiones/);
  });

  it('expone las cabeceras estandar de limite', async () => {
    const app = appDePrueba(5);
    const res = await request(app).get('/ping');
    expect(res.headers['ratelimit-limit'] ?? res.headers['ratelimit']).toBeDefined();
  });

  it('cada limitador lleva su propio contador', async () => {
    const a = appDePrueba(1);
    const b = appDePrueba(1);

    expect((await request(a).get('/ping')).status).toBe(200);
    expect((await request(a).get('/ping')).status).toBe(429);
    // El segundo limitador no debe verse afectado por el primero.
    expect((await request(b).get('/ping')).status).toBe(200);
  });
});
