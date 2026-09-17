import { Request, Response, NextFunction } from 'express';
import {
  createTeamRequestService,
  getTeamRequestsByProject,
  acceptTeamRequest,
  rejectTeamRequest,
  cancelTeamRequest,
} from '../services/teamRequest.service.js';
import { badRequest } from '../utils/errors.js';

export async function postTeamRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id_proyecto = parseInt(req.params.id_proyecto, 10);
    if (isNaN(id_proyecto)) throw badRequest('id_proyecto debe ser un número');

    const result = await createTeamRequestService(
      id_proyecto,
      req.user!.codigo_cucei!,
      req.body,
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getProjectTeamRequests(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id_proyecto = parseInt(req.params.id_proyecto, 10);
    if (isNaN(id_proyecto)) throw badRequest('id_proyecto debe ser un número');

    const requests = await getTeamRequestsByProject(id_proyecto, req.user!.codigo_cucei!);
    res.json(requests);
  } catch (err) {
    next(err);
  }
}

export async function acceptTeamRequestHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id_solicitud = parseInt(req.params.id_solicitud, 10);
    if (isNaN(id_solicitud)) throw badRequest('id_solicitud debe ser un número');

    await acceptTeamRequest(id_solicitud, req.user!.codigo_cucei!);
    res.json({ message: 'Solicitud aceptada' });
  } catch (err) {
    next(err);
  }
}

export async function rejectTeamRequestHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id_solicitud = parseInt(req.params.id_solicitud, 10);
    if (isNaN(id_solicitud)) throw badRequest('id_solicitud debe ser un número');

    await rejectTeamRequest(id_solicitud, req.user!.codigo_cucei!);
    res.json({ message: 'Solicitud rechazada' });
  } catch (err) {
    next(err);
  }
}

export async function cancelTeamRequestHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id_solicitud = parseInt(req.params.id_solicitud, 10);
    if (isNaN(id_solicitud)) throw badRequest('id_solicitud debe ser un número');

    await cancelTeamRequest(id_solicitud, req.user!.codigo_cucei!);
    res.json({ message: 'Solicitud cancelada' });
  } catch (err) {
    next(err);
  }
}
