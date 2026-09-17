import { api } from './api.js';

export interface AuthUser {
  id: number;
  codigo_cucei: string | null;
  rol: 'alumno' | 'mentor' | 'admin';
}

export interface GoogleLoginResult {
  token: string;
  user: AuthUser;
  needsOnboarding: boolean;
}

export const loginWithGoogle = (id_token: string): Promise<GoogleLoginResult> =>
  api.post('/auth/google', { id_token }, true);

export const completeProfile = (codigo_cucei: string): Promise<{ message: string }> =>
  api.post('/auth/complete-profile', { codigo_cucei });
