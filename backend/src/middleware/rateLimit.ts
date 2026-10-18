import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import { AppError } from '../utils/errors.js';

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
  return rateLimit({
    windowMs: ventanaMs,
    limit: maximo,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, _res, next) => {
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
