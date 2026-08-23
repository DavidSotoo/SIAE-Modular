import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  getMyStudentProfile,
  putMyStudentProfile,
  searchStudentsHandler,
  getMyStudentTeamRequests,
} from '../controllers/student.controller.js';
import { getMyProjectHandler } from '../controllers/project.controller.js';

const router = Router();

// GET /api/students/me/project
router.get(
  '/students/me/project',
  authenticate,
  requireRole('alumno'),
  getMyProjectHandler,
);

// GET /api/students/me/profile — perfil del alumno autenticado
router.get(
  '/students/me/profile',
  authenticate,
  requireRole('alumno'),
  getMyStudentProfile,
);

// PUT /api/students/me/profile — actualiza perfil (upsert)
router.put(
  '/students/me/profile',
  authenticate,
  requireRole('alumno'),
  putMyStudentProfile,
);

// GET /api/students/search — busca alumnos disponibles
router.get(
  '/students/search',
  authenticate,
  requireRole('alumno'),
  searchStudentsHandler,
);

// GET /api/students/me/team-requests — solicitudes enviadas/recibidas del alumno
router.get(
  '/students/me/team-requests',
  authenticate,
  requireRole('alumno'),
  getMyStudentTeamRequests,
);

export default router;
