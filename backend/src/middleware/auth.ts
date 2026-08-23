import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { unauthorized, forbidden } from '../utils/errors.js';

export interface AuthUser {
  id: number;
  codigo_cucei: string;
  rol: 'alumno' | 'mentor' | 'admin';
}

// Extiende el tipo de Request de Express para incluir req.user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Middleware de autenticación: verifica el JWT en Authorization: Bearer <token>
 * y popula req.user = { id, codigo_cucei, rol }.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return next(unauthorized('Token de acceso no proporcionado'));
    }

    const token = header.slice(7);
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET no configurado');

    const payload = jwt.verify(token, secret) as AuthUser;
    req.user = payload;
    next();
  } catch {
    next(unauthorized('Token inválido o expirado'));
  }
}

/**
 * Middleware RBAC: verifica que req.user tenga uno de los roles permitidos.
 * Debe usarse DESPUÉS de `authenticate`.
 *
 * @example
 * router.get('/ruta', authenticate, requireRole('admin', 'mentor'), controller)
 */
export function requireRole(...roles: Array<'alumno' | 'mentor' | 'admin'>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.rol)) {
      return next(forbidden(`Se requiere rol: ${roles.join(' o ')}`));
    }
    next();
  };
}
