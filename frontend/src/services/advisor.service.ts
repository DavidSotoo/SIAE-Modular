import { api } from './api.js';
import type { AdvisorProfile, AdvisorSearchResult, AdvisorRequestCreate, AdvisorRequest } from '../types/index.js';

// TODO(backend): agregar endpoint GET /advisors/:id
export const getAdvisorById = (id_mentor: number): Promise<AdvisorProfile> => 
  api.get('/advisors/' + id_mentor);

export const searchAdvisors = (params: { area?: number }): Promise<AdvisorSearchResult[]> => {
  const query = params.area ? '?area=' + params.area : '';
  return api.get('/advisors/search' + query);
};

export const createAdvisorRequest = (id_proyecto: number, body: AdvisorRequestCreate): Promise<AdvisorRequest> =>
  api.post('/projects/' + id_proyecto + '/advisor-requests', body);
