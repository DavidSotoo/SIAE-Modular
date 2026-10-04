import { api } from './api.js';
import type { AdvisorRequest } from '../types/index.js';

export const listMentorAdvisorRequests = (): Promise<AdvisorRequest[]> =>
  api.get('/mentors/me/advisor-requests');

export const acceptAdvisorRequest = (id_solicitud: number): Promise<{ message: string }> =>
  api.post('/advisor-requests/' + id_solicitud + '/accept', {});

export const rejectAdvisorRequest = (id_solicitud: number): Promise<{ message: string }> =>
  api.post('/advisor-requests/' + id_solicitud + '/reject', {});
