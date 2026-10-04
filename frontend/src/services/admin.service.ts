import { api } from './api.js';
import type { AdminProjectRow, AdminProjectDetail, AdminProjectFilters, AdminStats } from '../types/index.js';

function buildQuery(filters: AdminProjectFilters): string {
  const params = new URLSearchParams();
  if (filters.estado) params.set('estado', filters.estado);
  if (filters.search) params.set('search', filters.search);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const listAdminProjects = (filters: AdminProjectFilters = {}): Promise<AdminProjectRow[]> =>
  api.get('/admin/projects' + buildQuery(filters));

export const getAdminStats = (): Promise<AdminStats> =>
  api.get('/admin/stats');

export const getAdminProjectDetail = (id_proyecto: number): Promise<AdminProjectDetail> =>
  api.get('/admin/projects/' + id_proyecto);

export const exportProjectsCsv = (filters: AdminProjectFilters = {}): Promise<Blob> =>
  api.getBlob('/admin/export/csv' + buildQuery(filters));

export const exportProjectsXlsx = (filters: AdminProjectFilters = {}): Promise<Blob> =>
  api.getBlob('/admin/export/xlsx' + buildQuery(filters));

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
