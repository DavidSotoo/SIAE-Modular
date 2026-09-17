import { Request, Response, NextFunction } from 'express';
import {
  getMyProfile,
  updateMyProfile,
  searchStudentsService,
} from '../services/student.service.js';
import { getMyTeamRequests } from '../services/teamRequest.service.js';
import { badRequest } from '../utils/errors.js';

export async function getMyStudentProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const profile = await getMyProfile(req.user!.id);
    res.json(profile);
  } catch (err) {
    next(err);
  }
}

export async function putMyStudentProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const updated = await updateMyProfile(req.user!.id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function searchStudentsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { skill, area, estado_busqueda, semestre_min, semestre_max } = req.query;

    const filters = {
      skill: skill ? parseInt(skill as string, 10) : undefined,
      area: area ? parseInt(area as string, 10) : undefined,
      estado_busqueda: estado_busqueda as string | undefined,
      semestre_min: semestre_min ? parseInt(semestre_min as string, 10) : undefined,
      semestre_max: semestre_max ? parseInt(semestre_max as string, 10) : undefined,
    };

    if (filters.skill !== undefined && isNaN(filters.skill)) {
      throw badRequest('skill debe ser un número entero');
    }
    if (filters.area !== undefined && isNaN(filters.area)) {
      throw badRequest('area debe ser un número entero');
    }

    const results = await searchStudentsService(filters);
    res.json(results);
  } catch (err) {
    next(err);
  }
}

export async function getMyStudentTeamRequests(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const requests = await getMyTeamRequests(req.user!.codigo_cucei!);
    res.json(requests);
  } catch (err) {
    next(err);
  }
}
