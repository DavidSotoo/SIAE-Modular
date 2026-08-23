import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { createProjectHandler } from '../controllers/project.controller.js';

const router = Router();

// POST /api/projects — crear proyecto
router.post(
  '/projects',
  authenticate,
  requireRole('alumno'),
  createProjectHandler,
);

export default router;