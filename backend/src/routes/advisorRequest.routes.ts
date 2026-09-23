import { Router } from 'express';
import { authenticate, requireRole, requireOnboarded } from '../middleware/auth.js';
import {
  postAdvisorRequest,
  getMentorAdvisorRequestsHandler,
  acceptAdvisorRequestHandler,
  rejectAdvisorRequestHandler,
} from '../controllers/advisorRequest.controller.js';

const router = Router();

// POST /api/projects/:id_proyecto/advisor-requests — crear solicitud de asesoría (alumno)
router.post(
  '/projects/:id_proyecto/advisor-requests',
  authenticate,
  requireRole('alumno'),
  requireOnboarded,
  postAdvisorRequest,
);

// GET /api/mentors/me/advisor-requests — solicitudes recibidas por el mentor (mentor)
router.get(
  '/mentors/me/advisor-requests',
  authenticate,
  requireRole('mentor'),
  getMentorAdvisorRequestsHandler,
);

// POST /api/advisor-requests/:id_solicitud/accept — aceptar (mentor)
router.post(
  '/advisor-requests/:id_solicitud/accept',
  authenticate,
  requireRole('mentor'),
  acceptAdvisorRequestHandler,
);

// POST /api/advisor-requests/:id_solicitud/reject — rechazar (mentor)
router.post(
  '/advisor-requests/:id_solicitud/reject',
  authenticate,
  requireRole('mentor'),
  rejectAdvisorRequestHandler,
);

export default router;
