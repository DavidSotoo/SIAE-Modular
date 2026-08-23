import { api } from './api.js';
import type {
  Skill, Area,
  StudentProfile, StudentProfileUpdate, StudentSearchResult,
  TeamRequest, TeamRequestCreate,
} from '../types/index.js';

// ─── Catálogos ──────────────────────────────────────────────────────────────
export const getSkills = (): Promise<Skill[]> =>
  api.get('/skills');

export const getAreas = (): Promise<Area[]> =>
  api.get('/areas');

// ─── Perfil de alumno (autenticado) ─────────────────────────────────────────
export const getMyProfile = (): Promise<StudentProfile> =>
  api.get('/students/me/profile');

export const updateMyProfile = (data: StudentProfileUpdate): Promise<StudentProfile> =>
  api.put('/students/me/profile', data);

// ─── Búsqueda de alumnos ─────────────────────────────────────────────────────
export interface StudentSearchParams {
  skill?:           number;
  area?:            number;
  estado_busqueda?: string;
  semestre_min?:    number;
  semestre_max?:    number;
}

export const searchStudents = (params: StudentSearchParams): Promise<StudentSearchResult[]> => {
  const qs = new URLSearchParams();
  if (params.skill           != null) qs.set('skill',           String(params.skill));
  if (params.area            != null) qs.set('area',            String(params.area));
  if (params.estado_busqueda)          qs.set('estado_busqueda', params.estado_busqueda);
  if (params.semestre_min    != null) qs.set('semestre_min',    String(params.semestre_min));
  if (params.semestre_max    != null) qs.set('semestre_max',    String(params.semestre_max));
  const query = qs.toString();
  return api.get(`/students/search${query ? '?' + query : ''}`);
};

// ─── Team Requests ────────────────────────────────────────────────────────────
export const getMyTeamRequests = (): Promise<TeamRequest[]> =>
  api.get('/students/me/team-requests');

export const getProjectTeamRequests = (id_proyecto: number): Promise<TeamRequest[]> =>
  api.get(`/projects/${id_proyecto}/team-requests`);

export const createTeamRequest = (
  id_proyecto: number,
  body: TeamRequestCreate,
): Promise<TeamRequest> =>
  api.post(`/projects/${id_proyecto}/team-requests`, body);

export const acceptTeamRequest = (id_solicitud: number): Promise<void> =>
  api.post(`/team-requests/${id_solicitud}/accept`, {});

export const rejectTeamRequest = (id_solicitud: number): Promise<void> =>
  api.post(`/team-requests/${id_solicitud}/reject`, {});

export const cancelTeamRequest = (id_solicitud: number): Promise<void> =>
  api.post(`/team-requests/${id_solicitud}/cancel`, {});