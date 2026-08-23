import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  getMyAdvisorAvailability,
  putMyAdvisorAvailability,
  searchAdvisorsHandler,
} from '../controllers/advisor.controller.js';

const router = Router();

// GET /api/advisors/me/availability — perfil de disponibilidad del asesor autenticado
router.get(
  '/advisors/me/availability',
  authenticate,
  requireRole('mentor'),
  getMyAdvisorAvailability,
);

// PUT /api/advisors/me/availability — actualiza disponibilidad
router.put(
  '/advisors/me/availability',
  authenticate,
  requireRole('mentor'),
  putMyAdvisorAvailability,
);

// GET /api/advisors/search — busca asesores con cupo disponible
router.get(
  '/advisors/search',
  authenticate,
  requireRole('alumno'),
  searchAdvisorsHandler,
);

export default router;
