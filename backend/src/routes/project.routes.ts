import { Router } from 'express';
import { authenticate, requireRole, requireOnboarded } from '../middleware/auth.js';
import {
  createProjectHandler,
  getMentorProjectsHandler,
} from '../controllers/project.controller.js';

import {
  uploadProtocolHandler,
  downloadProtocolHandler,
  getHistoryHandler,
  validateProjectHandler,
  registerProjectHandler,
  rejectProjectHandler,
} from '../controllers/projectState.controller.js';
import { validateParams, validateBody } from '../middleware/validate.js';
import { paramsIdProyecto } from '../schemas/common.schema.js';
import { crearProyectoBody, rechazarProyectoBody } from '../schemas/project.schema.js';
import multer from 'multer';

// El protocolo se queda en memoria y de ahi pasa a la base de datos. No se
// escribe en disco: en Vercel el sistema de archivos es efimero y de solo
// lectura, asi que un uploads/ ni se podria crear ni sobreviviria al deploy.
const upload = multer({
  storage: multer.memoryStorage(),
  // Vercel corta las peticiones (y las respuestas) de sus funciones en 4.5 MB
  // a nivel de infraestructura. Con el tope en 4 MB el usuario recibe el error
  // claro de multer en vez de un 413 opaco del proxy.
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF')); // Multer capturará esto como error 500, o podemos usar un custom error
    }
  },
});

const router = Router();

// POST /api/projects — crear proyecto
router.post(
  '/projects',
  authenticate,
  requireRole('alumno'),
  requireOnboarded,
  validateBody(crearProyectoBody),
  createProjectHandler,
);

// POST /api/projects/:id_proyecto/protocol — subir/re-subir protocolo
router.post(
  '/projects/:id_proyecto/protocol',
  authenticate,
  requireRole('alumno'),
  requireOnboarded,
  validateParams(paramsIdProyecto),
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  uploadProtocolHandler,
);

// GET /api/mentors/me/projects — proyectos asignados al mentor autenticado
router.get('/mentors/me/projects', authenticate, requireRole('mentor'), getMentorProjectsHandler);

// GET /api/projects/:id_proyecto/protocol — descargar/visualizar el protocolo vigente
// (si lo abre el mentor asignado, marca pdf_visualizado=true — ver IMF-03)
router.get(
  '/projects/:id_proyecto/protocol',
  authenticate,
  validateParams(paramsIdProyecto),
  downloadProtocolHandler,
);

// GET /api/projects/:id_proyecto/history — ver historial
router.get(
  '/projects/:id_proyecto/history',
  authenticate,
  validateParams(paramsIdProyecto),
  // requireRole no se usa estricto aquí porque puede ser alumno o mentor, el servicio valida
  getHistoryHandler,
);

// POST /api/projects/:id_proyecto/validate — mentor aprueba protocolo (pendiente -> validado)
router.post(
  '/projects/:id_proyecto/validate',
  authenticate,
  requireRole('mentor'),
  validateParams(paramsIdProyecto),
  validateProjectHandler,
);

// POST /api/projects/:id_proyecto/register — admin emite folio (validado -> registrado)
router.post(
  '/projects/:id_proyecto/register',
  authenticate,
  requireRole('admin'),
  validateParams(paramsIdProyecto),
  registerProjectHandler,
);

// POST /api/projects/:id_proyecto/reject — mentor rechaza proyecto
router.post(
  '/projects/:id_proyecto/reject',
  authenticate,
  requireRole('mentor'),
  validateParams(paramsIdProyecto),
  validateBody(rechazarProyectoBody),
  rejectProjectHandler,
);

export default router;
