import { Router } from 'express';
import { authenticate, requireRole, requireOnboarded } from '../middleware/auth.js';
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
  requireOnboarded,
  postTeamRequest,
);

// GET /api/projects/:id_proyecto/team-requests — solicitudes de un proyecto
router.get(
  '/projects/:id_proyecto/team-requests',
  authenticate,
  requireRole('alumno'),
  requireOnboarded,
  getProjectTeamRequests,
);

// POST /api/team-requests/:id_solicitud/accept
router.post(
  '/team-requests/:id_solicitud/accept',
  authenticate,
  requireRole('alumno'),
  requireOnboarded,
  acceptTeamRequestHandler,
);

// POST /api/team-requests/:id_solicitud/reject
router.post(
  '/team-requests/:id_solicitud/reject',
  authenticate,
  requireRole('alumno'),
  requireOnboarded,
  rejectTeamRequestHandler,
);

// POST /api/team-requests/:id_solicitud/cancel
router.post(
  '/team-requests/:id_solicitud/cancel',
  authenticate,
  requireRole('alumno'),
  requireOnboarded,
  cancelTeamRequestHandler,
);

export default router;
