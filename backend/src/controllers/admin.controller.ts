import { Request, Response, NextFunction } from 'express';
import {
  listProjectsForAdmin,
  getProjectDetailForAdmin,
  getStats,
  buildProjectsCsv,
  buildProjectsXlsx,
} from '../services/admin.service.js';
import { AdminProjectFilters } from '../models/admin.model.js';

function parseFilters(req: Request): AdminProjectFilters {
  const { estado, search } = req.query;
  return {
    estado: typeof estado === 'string' && estado.length > 0 ? estado : undefined,
    search: typeof search === 'string' && search.length > 0 ? search : undefined,
  };
}

export async function listProjectsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const projects = await listProjectsForAdmin(parseFilters(req));
    res.json(projects);
  } catch (err) {
    next(err);
  }
}

export async function getStatsHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

export async function getProjectDetailHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const id_proyecto = Number(req.params.id_proyecto);
    const detail = await getProjectDetailForAdmin(id_proyecto);
    res.json(detail);
  } catch (err) {
    next(err);
  }
}

export async function exportCsvHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const projects = await listProjectsForAdmin(parseFilters(req));
    const csv = buildProjectsCsv(projects);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="proyectos_siae.csv"');
    res.send('﻿' + csv);
  } catch (err) {
    next(err);
  }
}

export async function exportXlsxHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const projects = await listProjectsForAdmin(parseFilters(req));
    const buffer = await buildProjectsXlsx(projects);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="proyectos_siae.xlsx"');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}
