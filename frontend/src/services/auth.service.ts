import { api } from './api.js';

export const login = (codigo_cucei: string, password: string): Promise<{ token: string, user: any }> =>
  api.post('/login', { codigo_cucei, password }, true);