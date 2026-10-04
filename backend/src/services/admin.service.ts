import ExcelJS from 'exceljs';
import {
  findAllProjectsForAdmin,
  findProjectDetailForAdmin,
  getAdminStats,
  AdminProjectFilters,
  AdminProjectRow,
} from '../models/admin.model.js';
import { getProjectHistory } from '../models/stateLog.model.js';
import { notFound } from '../utils/errors.js';

export async function listProjectsForAdmin(filters: AdminProjectFilters) {
  return findAllProjectsForAdmin(filters);
}

export async function getStats() {
  return getAdminStats();
}

export async function getProjectDetailForAdmin(id_proyecto: number) {
  const project = await findProjectDetailForAdmin(id_proyecto);
  if (!project) throw notFound('Proyecto no encontrado');

  const history = await getProjectHistory(id_proyecto);
  return { ...project, historial: history };
}

const EXPORT_COLUMNS: Array<{ header: string; key: keyof AdminProjectRow; width?: number }> = [
  { header: 'Folio', key: 'codigo_folio', width: 14 },
  { header: 'Título', key: 'titulo', width: 40 },
  { header: 'Estado', key: 'estado_actual', width: 14 },
  { header: 'Mentor', key: 'mentor_nombre', width: 24 },
  { header: 'Integrantes', key: 'num_integrantes', width: 12 },
  { header: 'Fecha de folio', key: 'fecha_folio', width: 20 },
  { header: 'Creado', key: 'created_at', width: 20 },
];

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function buildProjectsCsv(rows: AdminProjectRow[]): string {
  const header = EXPORT_COLUMNS.map((c) => c.header).join(',');
  const lines = rows.map((row) =>
    EXPORT_COLUMNS.map((c) => {
      const raw = formatCell(row[c.key]);
      const escaped = raw.replace(/"/g, '""');
      return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
    }).join(','),
  );
  return [header, ...lines].join('\n');
}

export async function buildProjectsXlsx(rows: AdminProjectRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SIAE-Modular';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Proyectos');
  sheet.columns = EXPORT_COLUMNS.map((c) => ({ header: c.header, key: c.key as string, width: c.width }));
  sheet.getRow(1).font = { bold: true };

  rows.forEach((row) => {
    sheet.addRow(EXPORT_COLUMNS.reduce((acc, c) => {
      acc[c.key as string] = formatCell(row[c.key]);
      return acc;
    }, {} as Record<string, string>));
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
