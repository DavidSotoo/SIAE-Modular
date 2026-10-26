import { Request, Response, NextFunction } from 'express';
import {
  submitProtocol,
  validateProject,
  registerProject,
  rejectProject,
  getProjectHistory,
  getProtocolFile,
} from '../services/projectState.service.js';
import { badRequest } from '../utils/errors.js';

export const uploadProtocolHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id_proyecto = Number(req.params.id_proyecto);
    const { id, codigo_cucei } = req.user!;

    if (!req.file) {
      throw badRequest('No se subió ningún archivo PDF');
    }

    const contenido = req.file.buffer; // multer guarda en memoria, no en disco

    // El mimetype del multipart lo declara el cliente y se puede falsificar;
    // se confirma leyendo la cabecera real de los bytes recibidos.
    if (contenido.subarray(0, 5).toString('latin1') !== '%PDF-') {
      throw badRequest('El archivo no es un PDF válido');
    }

    // El protocolo entra en la misma transaccion que el cambio de estado, asi
    // que un rechazo por permisos o estado no deja nada atras: ya no hay PDFs
    // huerfanos que limpiar (antes habia que borrarlos a mano, SM-62).
    await submitProtocol(id_proyecto, id, codigo_cucei!, {
      contenido,
      nombre: req.file.originalname,
    });
    res.json({ message: 'Protocolo subido exitosamente' });
  } catch (err) {
    next(err);
  }
};

export const downloadProtocolHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id_proyecto = Number(req.params.id_proyecto);
    const { id, codigo_cucei, rol } = req.user!;

    const { contenido, nombre } = await getProtocolFile(id_proyecto, id, codigo_cucei, rol);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(nombre)}"`);
    res.send(contenido);
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
