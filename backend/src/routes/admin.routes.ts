import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  listProjectsHandler,
  getStatsHandler,
  getProjectDetailHandler,
  exportCsvHandler,
  exportXlsxHandler,
} from '../controllers/admin.controller.js';

const router = Router();

router.use('/admin', authenticate, requireRole('admin'));

// GET /api/admin/projects?estado=&search= — listado general de proyectos/folios
router.get('/admin/projects', listProjectsHandler);

// GET /api/admin/stats — conteos por estado
router.get('/admin/stats', getStatsHandler);

// GET /api/admin/projects/:id_proyecto — detalle + historial
router.get('/admin/projects/:id_proyecto', getProjectDetailHandler);

// GET /api/admin/export/csv — exportación CSV
router.get('/admin/export/csv', exportCsvHandler);

// GET /api/admin/export/xlsx — exportación Excel
router.get('/admin/export/xlsx', exportXlsxHandler);

export default router;
