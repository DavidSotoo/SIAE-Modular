import { Router } from 'express';
import { googleLoginHandler, completeProfileHandler, meHandler } from '../controllers/auth.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/google — login con Google (alumno/mentor por dominio institucional, admin por lista blanca)
router.post('/auth/google', googleLoginHandler);

// GET /api/auth/me — datos básicos del usuario autenticado (nombre, email, rol)
router.get('/auth/me', authenticate, meHandler);

// POST /api/auth/complete-profile — alumno captura su código CUCEI la primera vez que entra
router.post(
  '/auth/complete-profile',
  authenticate,
  requireRole('alumno'),
  completeProfileHandler,
);

export default router;
