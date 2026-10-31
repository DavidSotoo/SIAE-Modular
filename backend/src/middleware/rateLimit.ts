import rateLimit, { type RateLimitRequestHandler, type Options } from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';

// express-rate-limit, igual que helmet, trae sus propios tipos con un `exports`
// sin condición "types". Con moduleResolution NodeNext su default export se
// resuelve como el namespace del módulo (no callable) en algunos entornos —el
// build de Vercel corre con una versión de Node distinta a la del CI—. El cast
// vía unknown fija el tipo correcto sin cambiar el comportamiento en ejecución.
const crearRateLimit = rateLimit as unknown as (
  options: Partial<Options>,
) => RateLimitRequestHandler;

interface OpcionesLimitador {
  ventanaMs: number;
  maximo: number;
  mensaje: string;
  codigo: string;
}

/**
 * Fabrica un limitador por IP. El handler lanza un AppError para que la
 * respuesta tenga la misma forma `{ error, code }` que el resto de la API.
 */
export function crearLimitador({
  ventanaMs,
  maximo,
  mensaje,
  codigo,
}: OpcionesLimitador): RateLimitRequestHandler {
  return crearRateLimit({
    windowMs: ventanaMs,
    limit: maximo,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req: Request, _res: Response, next: NextFunction) => {
      next(new AppError(mensaje, 429, codigo));
    },
  });
}

const MINUTO = 60 * 1000;

/** Tope general de la API: holgado, solo frena el abuso evidente. */
export const limitadorGeneral = crearLimitador({
  ventanaMs: 15 * MINUTO,
  maximo: 300,
  mensaje: 'Demasiadas peticiones. Intenta de nuevo en unos minutos.',
  codigo: 'RATE_LIMITED',
});

/**
 * Tope estricto para el login: es el endpoint que verifica tokens de Google
 * contra un servicio externo, asi que es el mas caro de abusar.
 */
export const limitadorLogin = crearLimitador({
  ventanaMs: 15 * MINUTO,
  maximo: 20,
  mensaje: 'Demasiados intentos de inicio de sesion. Espera unos minutos.',
  codigo: 'RATE_LIMITED',
});
