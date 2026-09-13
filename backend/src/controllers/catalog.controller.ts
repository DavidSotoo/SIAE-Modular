import { Request, Response, NextFunction } from 'express';
import { findAllSkills, findAllAreas, createSkill } from '../models/catalog.model.js';
import { badRequest } from '../utils/errors.js';

export async function getSkills(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const skills = await findAllSkills();
    res.json(skills);
  } catch (err) {
    next(err);
  }
}

export async function getAreas(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const areas = await findAllAreas();
    res.json(areas);
  } catch (err) {
    next(err);
  }
}

export async function postSkill(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { nombre, tipo } = req.body;
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
      throw badRequest('El nombre de la skill es obligatorio');
    }
    if (tipo !== 'hard' && tipo !== 'soft') {
      throw badRequest('El tipo debe ser "hard" o "soft"');
    }
    const skill = await createSkill(nombre.trim(), tipo);
    res.status(201).json(skill);
  } catch (err) {
    next(err);
  }
}
