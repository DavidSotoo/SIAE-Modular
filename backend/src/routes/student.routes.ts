import { Router } from 'express';
import { authenticate, requireRole, requireOnboarded } from '../middleware/auth.js';
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
  requireOnboarded,
  getMyProjectHandler,
);

// GET /api/students/me/profile — perfil del alumno autenticado
// (no exige requireOnboarded: el propio flujo de completar perfil vive aquí
// a futuro; no depende de codigo_cucei en el handler)
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
  requireOnboarded,
  getMyStudentTeamRequests,
);

export default router;
