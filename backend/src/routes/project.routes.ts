import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { createProjectHandler, getMentorProjectsHandler } from '../controllers/project.controller.js';

import {
  uploadProtocolHandler,
  getHistoryHandler,
  validateProjectHandler,
  registerProjectHandler,
  rejectProjectHandler
} from '../controllers/projectState.controller.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

// Asegurar que exista el directorio de subida
const uploadDir = path.join(process.cwd(), 'uploads/protocolos');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const id_proyecto = req.params.id_proyecto || 'unknown';
    const timestamp = Date.now();
    cb(null, `protocolo_${id_proyecto}_${timestamp}.pdf`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF')); // Multer capturará esto como error 500, o podemos usar un custom error
    }
  }
});

const router = Router();

// POST /api/projects — crear proyecto
router.post(
  '/projects',
  authenticate,
  requireRole('alumno'),
  createProjectHandler,
);

// POST /api/projects/:id_proyecto/protocol — subir/re-subir protocolo
router.post(
  '/projects/:id_proyecto/protocol',
  authenticate,
  requireRole('alumno'),
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  uploadProtocolHandler
);

// GET /api/mentors/me/projects — proyectos asignados al mentor autenticado
router.get(
  '/mentors/me/projects',
  authenticate,
  requireRole('mentor'),
  getMentorProjectsHandler
);

// GET /api/projects/:id_proyecto/history — ver historial
router.get(
  '/projects/:id_proyecto/history',
  authenticate,
  // requireRole no se usa estricto aquí porque puede ser alumno o mentor, el servicio valida
  getHistoryHandler
);

// POST /api/projects/:id_proyecto/validate — mentor aprueba protocolo (pendiente -> validado)
router.post(
  '/projects/:id_proyecto/validate',
  authenticate,
  requireRole('mentor'),
  validateProjectHandler
);

// POST /api/projects/:id_proyecto/register — admin emite folio (validado -> registrado)
router.post(
  '/projects/:id_proyecto/register',
  authenticate,
  requireRole('admin'),
  registerProjectHandler
);

// POST /api/projects/:id_proyecto/reject — mentor rechaza proyecto
router.post(
  '/projects/:id_proyecto/reject',
  authenticate,
  requireRole('mentor'),
  rejectProjectHandler
);

export default router;