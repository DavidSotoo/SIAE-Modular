import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { submitProtocol, validateProject, registerProject, rejectProject, getProjectHistory, getProtocolFilePath } from '../services/projectState.service.js';
import { badRequest } from '../utils/errors.js';

export const uploadProtocolHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id_proyecto = Number(req.params.id_proyecto);
    const { id, codigo_cucei } = req.user!;
    
    if (!req.file) {
      throw badRequest('No se subió ningún archivo PDF');
    }

    const pdf_path = req.file.path; // Destino local de multer
    
    await submitProtocol(id_proyecto, id, codigo_cucei, pdf_path);
    res.json({ message: 'Protocolo subido exitosamente' });
  } catch (err) {
    next(err);
  }
};

export const downloadProtocolHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id_proyecto = Number(req.params.id_proyecto);
    const { id, codigo_cucei, rol } = req.user!;

    const pdf_path = await getProtocolFilePath(id_proyecto, id, codigo_cucei, rol);
    res.download(path.resolve(pdf_path));
  } catch (err) {
    next(err);
  }
};

export const getHistoryHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id_proyecto = Number(req.params.id_proyecto);
    const { id, codigo_cucei, rol } = req.user!;
    
    const history = await getProjectHistory(id_proyecto, id, codigo_cucei, rol);
    res.json(history);
  } catch (err) {
    next(err);
  }
};

export const validateProjectHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id_proyecto = Number(req.params.id_proyecto);
    const { id } = req.user!;

    await validateProject(id_proyecto, id);
    res.json({ message: 'Protocolo validado, listo para que administración emita el folio' });
  } catch (err) {
    next(err);
  }
};

export const registerProjectHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id_proyecto = Number(req.params.id_proyecto);
    const { id } = req.user!;

    const result = await registerProject(id_proyecto, id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const rejectProjectHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id_proyecto = Number(req.params.id_proyecto);
    const { id } = req.user!;
    const { comentario } = req.body;
    
    await rejectProject(id_proyecto, id, comentario);
    res.json({ message: 'Proyecto rechazado con comentarios' });
  } catch (err) {
    next(err);
  }
};
