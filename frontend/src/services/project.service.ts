import { api } from './api.js';
import type { Project, ProjectStateLog } from '../types/index.js';

export const getMyProject = (): Promise<Project | null> =>
  api.get('/students/me/project');

export const createProject = (titulo: string): Promise<Project> =>
  api.post('/projects', { titulo });

// TODO(backend): endpoint pendiente, Etapa 3
export const getProjectHistory = (id_proyecto: number): Promise<ProjectStateLog[]> =>
  api.get('/projects/' + id_proyecto + '/history');

// TODO(backend): endpoint pendiente, Etapa 3
export const uploadProtocol = (id_proyecto: number, file: File): Promise<Project> => {
  const formData = new FormData();
  formData.append('protocolo', file);
  return api.upload('/projects/' + id_proyecto + '/protocol', formData);
};