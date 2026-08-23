import { api } from './api.js';
import type { Project } from '../types/index.js';

export const getMyProject = (): Promise<Project | null> =>
  api.get('/students/me/project');

export const createProject = (titulo: string): Promise<Project> =>
  api.post('/projects', { titulo });