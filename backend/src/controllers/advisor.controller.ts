import { Request, Response, NextFunction } from 'express';
import {
  getMyAvailability,
  updateMyAvailability,
  searchAdvisorsService,
} from '../services/advisor.service.js';
import { badRequest } from '../utils/errors.js';

export async function getMyAdvisorAvailability(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const profile = await getMyAvailability(req.user!.id);
    res.json(profile);
  } catch (err) {
    next(err);
  }
}

export async function putMyAdvisorAvailability(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const updated = await updateMyAvailability(req.user!.id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function searchAdvisorsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { area } = req.query;
    const areaId = area ? parseInt(area as string, 10) : undefined;
    if (areaId !== undefined && isNaN(areaId)) {
      throw badRequest('area debe ser un número entero');
    }

    const results = await searchAdvisorsService(areaId);
    res.json(results);
  } catch (err) {
    next(err);
  }
}
