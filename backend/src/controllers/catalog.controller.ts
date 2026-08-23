import { Request, Response, NextFunction } from 'express';
import { findAllSkills, findAllAreas } from '../models/catalog.model.js';

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
