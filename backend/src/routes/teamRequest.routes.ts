import { Router } from 'express';
import { authenticate, requireRole, requireOnboarded } from '../middleware/auth.js';
import {
  postTeamRequest,
  getProjectTeamRequests,
  acceptTeamRequestHandler,
  rejectTeamRequestHandler,
  cancelTeamRequestHandler,
} from '../controllers/teamRequest.controller.js';
import { validateParams } from '../middleware/validate.js';
import { paramsIdProyecto, paramsIdSolicitud } from '../schemas/common.schema.js';

const router = Router();

// POST /api/projects/:id_proyecto/team-requests — crear solicitud de equipo
router.post(
  '/projects/:id_proyecto/team-requests',
  authenticate,
  requireRole('alumno'),
  requireOnboarded,
  validateParams(paramsIdProyecto),
  postTeamRequest,
);

// GET /api/projects/:id_proyecto/team-requests — solicitudes de un proyecto
router.get(
  '/projects/:id_proyecto/team-requests',
  authenticate,
  requireRole('alumno'),
  requireOnboarded,
  validateParams(paramsIdProyecto),
  getProjectTeamRequests,
);

// POST /api/team-requests/:id_solicitud/accept
router.post(
  '/team-requests/:id_solicitud/accept',
  authenticate,
  requireRole('alumno'),
  requireOnboarded,
  validateParams(paramsIdSolicitud),
  acceptTeamRequestHandler,
);

// POST /api/team-requests/:id_solicitud/reject
router.post(
  '/team-requests/:id_solicitud/reject',
  authenticate,
  requireRole('alumno'),
  requireOnboarded,
  validateParams(paramsIdSolicitud),
  rejectTeamRequestHandler,
);

// POST /api/team-requests/:id_solicitud/cancel
router.post(
  '/team-requests/:id_solicitud/cancel',
  authenticate,
  requireRole('alumno'),
  requireOnboarded,
  validateParams(paramsIdSolicitud),
  cancelTeamRequestHandler,
);

export default router;
