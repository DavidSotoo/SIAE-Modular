import { Request, Response, NextFunction } from 'express';
import { loginWithGoogle, completeAlumnoProfile } from '../services/googleAuth.service.js';
import { badRequest } from '../utils/errors.js';

export async function googleLoginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id_token } = req.body;
    if (!id_token) throw badRequest('id_token es requerido');

    const result = await loginWithGoogle(id_token);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function completeProfileHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { codigo_cucei } = req.body;
    const { id } = req.user!;

    await completeAlumnoProfile(id, codigo_cucei);
    res.json({ message: 'Perfil completado' });
  } catch (error) {
    next(error);
  }
}
