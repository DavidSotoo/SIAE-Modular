import { Router } from 'express';
import { googleLoginHandler, completeProfileHandler } from '../controllers/auth.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/google — login con Google (alumno/mentor por dominio institucional, admin por lista blanca)
router.post('/auth/google', googleLoginHandler);

// POST /api/auth/complete-profile — alumno captura su código CUCEI la primera vez que entra
router.post(
  '/auth/complete-profile',
  authenticate,
  requireRole('alumno'),
  completeProfileHandler,
);

export default router;
