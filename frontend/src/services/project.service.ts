import { api } from './api.js';
import type { Project, ProjectStateLog } from '../types/index.js';

export const getMyProject = (): Promise<Project | null> =>
  api.get('/students/me/project');

export const createProject = (titulo: string): Promise<Project> =>
  api.post('/projects', { titulo });

export const getProjectHistory = (id_proyecto: number): Promise<ProjectStateLog[]> =>
  api.get('/projects/' + id_proyecto + '/history');

export const uploadProtocol = (id_proyecto: number, file: File): Promise<{ message: string }> => {
  const formData = new FormData();
  // El backend (multer) espera el campo 'file'
  formData.append('file', file);
  return api.upload('/projects/' + id_proyecto + '/protocol', formData);
};

export const downloadProtocol = (id_proyecto: number): Promise<Blob> =>
  api.getBlob('/projects/' + id_proyecto + '/protocol');

// ─── Mentor ──────────────────────────────────────────────────────────────────

export const getMentorProjects = (): Promise<Project[]> =>
  api.get('/mentors/me/projects');

export const validateProject = (id_proyecto: number): Promise<{ message: string }> =>
  api.post('/projects/' + id_proyecto + '/validate', {});

export const rejectProject = (id_proyecto: number, comentario: string): Promise<{ message: string }> =>
  api.post('/projects/' + id_proyecto + '/reject', { comentario });

// ─── Admin ───────────────────────────────────────────────────────────────────

export const registerProject = (id_proyecto: number): Promise<{ codigo_folio: string }> =>
  api.post('/projects/' + id_proyecto + '/register', {});