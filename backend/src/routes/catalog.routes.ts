import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getSkills, getAreas, postSkill } from '../controllers/catalog.controller.js';

const router = Router();

// GET /api/skills — lista de skills (requiere auth, cualquier rol)
router.get('/skills', authenticate, getSkills);

// POST /api/skills — crear nueva skill (requiere auth, cualquier rol)
router.post('/skills', authenticate, postSkill);

// GET /api/areas — lista de áreas de interés (requiere auth, cualquier rol)
router.get('/areas', authenticate, getAreas);

export default router;
