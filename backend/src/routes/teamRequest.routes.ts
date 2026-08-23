import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  postTeamRequest,
  getProjectTeamRequests,
  acceptTeamRequestHandler,
  rejectTeamRequestHandler,
  cancelTeamRequestHandler,
} from '../controllers/teamRequest.controller.js';

const router = Router();

// POST /api/projects/:id_proyecto/team-requests — crear solicitud de equipo
router.post(
  '/projects/:id_proyecto/team-requests',
  authenticate,
  requireRole('alumno'),
  postTeamRequest,
);

// GET /api/projects/:id_proyecto/team-requests — solicitudes de un proyecto
router.get(
  '/projects/:id_proyecto/team-requests',
  authenticate,
  requireRole('alumno'),
  getProjectTeamRequests,
);

// POST /api/team-requests/:id_solicitud/accept
router.post(
  '/team-requests/:id_solicitud/accept',
  authenticate,
  requireRole('alumno'),
  acceptTeamRequestHandler,
);

// POST /api/team-requests/:id_solicitud/reject
router.post(
  '/team-requests/:id_solicitud/reject',
  authenticate,
  requireRole('alumno'),
  rejectTeamRequestHandler,
);

// POST /api/team-requests/:id_solicitud/cancel
router.post(
  '/team-requests/:id_solicitud/cancel',
  authenticate,
  requireRole('alumno'),
  cancelTeamRequestHandler,
);

export default router;
