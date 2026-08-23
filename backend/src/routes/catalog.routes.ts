import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getSkills, getAreas } from '../controllers/catalog.controller.js';

const router = Router();

// GET /api/skills — lista de skills (requiere auth, cualquier rol)
router.get('/skills', authenticate, getSkills);

// GET /api/areas — lista de áreas de interés (requiere auth, cualquier rol)
router.get('/areas', authenticate, getAreas);

export default router;
