import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';
import { badRequest } from '../utils/errors.js';

/**
 * Valida una parte de la peticion contra un esquema de zod.
 *
 * Antes, un `:id_proyecto` no numerico llegaba como NaN hasta Postgres y
 * reventaba con `22P02` (HTTP 500). Ahora se corta en el borde con un 400
 * que explica el campo invalido.
 *
 * El resultado parseado reemplaza al original, asi que los controladores
 * reciben los tipos ya convertidos (p. ej. el id como number).
 */
function validate(fuente: 'params' | 'body' | 'query') {
  return (schema: ZodType) =>
    (req: Request, _res: Response, next: NextFunction): void => {
      const resultado = schema.safeParse(req[fuente]);
      if (!resultado.success) {
        const detalle = resultado.error.issues
          .map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message))
          .join('; ');
        return next(badRequest(detalle, 'VALIDATION_ERROR'));
      }
      // req.query es un getter en Express 5; se reasigna solo lo que se puede.
      if (fuente === 'query') {
        Object.assign(req.query, resultado.data);
      } else {
        req[fuente] = resultado.data as never;
      }
      next();
    };
}

export const validateParams = validate('params');
export const validateBody = validate('body');
export const validateQuery = validate('query');
