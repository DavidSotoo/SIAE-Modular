import { Request, Response, NextFunction } from 'express';
import {
  createAdvisorRequestService,
  getMentorAdvisorRequests,
  acceptAdvisorRequest,
  rejectAdvisorRequest,
} from '../services/advisorRequest.service.js';
import { badRequest } from '../utils/errors.js';

export async function postAdvisorRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id_proyecto = parseInt(req.params.id_proyecto, 10);
    if (isNaN(id_proyecto)) throw badRequest('id_proyecto debe ser un número');

    const result = await createAdvisorRequestService(id_proyecto, req.body, req.user!.codigo_cucei!);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getMentorAdvisorRequestsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const requests = await getMentorAdvisorRequests(req.user!.id);
    res.json(requests);
  } catch (err) {
    next(err);
  }
}

export async function acceptAdvisorRequestHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id_solicitud = parseInt(req.params.id_solicitud, 10);
    if (isNaN(id_solicitud)) throw badRequest('id_solicitud debe ser un número');

    await acceptAdvisorRequest(id_solicitud, req.user!.id);
    res.json({ message: 'Solicitud de asesoría aceptada' });
  } catch (err) {
    next(err);
  }
}

export async function rejectAdvisorRequestHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id_solicitud = parseInt(req.params.id_solicitud, 10);
    if (isNaN(id_solicitud)) throw badRequest('id_solicitud debe ser un número');

    await rejectAdvisorRequest(id_solicitud, req.user!.id);
    res.json({ message: 'Solicitud de asesoría rechazada' });
  } catch (err) {
    next(err);
  }
}
