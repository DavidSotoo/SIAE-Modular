import { Request, Response, NextFunction } from 'express';
import { createStudentProject, getMyActiveProject } from '../services/project.service.js';

export async function createProjectHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user as any;
    const { titulo } = req.body;
    
    const project = await createStudentProject(user.id, user.codigo_cucei, titulo);
    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
}

export async function getMyProjectHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user as any;
    const project = await getMyActiveProject(user.codigo_cucei);
    res.json(project); // Can be null, that's valid
  } catch (error) {
    next(error);
  }
}