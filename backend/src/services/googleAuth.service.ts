import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import {
  findUserByGoogleSub,
  findUserByEmail,
  createGoogleUser,
  linkGoogleSub,
  isCodigoCuceiTaken,
  setUserCodigoCucei,
  Rol,
  UserRow,
} from '../models/user.model.js';
import { badRequest, conflict, forbidden, unauthorized } from '../utils/errors.js';

const ALUMNO_DOMAIN = 'alumnos.udg.mx';
const MENTOR_DOMAIN = 'academicos.udg.mx';

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}

/**
 * Decide el rol a partir del perfil verificado de Google. Función pura,
 * sin I/O, para poder probarla sin necesitar un ID Token real.
 *
 * Prioridad: lista blanca de admin > dominio institucional. Así un correo
 * de coordinación dado de alta como admin nunca cae accidentalmente en
 * mentor/alumno aunque su dominio coincida.
 */
export function resolveRoleFromGoogleProfile(
  email: string,
  hd: string | undefined,
  adminEmails: string[],
): Rol | null {
  const normalized = email.toLowerCase();
  if (adminEmails.includes(normalized)) return 'admin';
  if (hd === ALUMNO_DOMAIN) return 'alumno';
  if (hd === MENTOR_DOMAIN) return 'mentor';
  return null;
}

function signSessionToken(user: { id: number; codigo_cucei: string | null; rol: Rol }) {
  const payload = { id: user.id, codigo_cucei: user.codigo_cucei, rol: user.rol };
  const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
  return { token, user: payload };
}

let client: OAuth2Client | null = null;
function getClient(): OAuth2Client {
  if (!client) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) throw new Error('GOOGLE_CLIENT_ID no configurado');
    client = new OAuth2Client(clientId);
  }
  return client;
}

export async function loginWithGoogle(idToken: string) {
  if (!idToken) throw badRequest('id_token es requerido');

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID no configurado');

  let payload;
  try {
    const ticket = await getClient().verifyIdToken({ idToken, audience: clientId });
    payload = ticket.getPayload();
  } catch {
    throw unauthorized('Token de Google inválido o expirado');
  }

  if (!payload || !payload.email || !payload.sub) {
    throw unauthorized('Token de Google inválido');
  }
  if (!payload.email_verified) {
    throw unauthorized('El correo de Google no está verificado');
  }

  const rol = resolveRoleFromGoogleProfile(payload.email, payload.hd, getAdminEmails());
  if (!rol) {
    throw forbidden(
      'Tu cuenta debe ser institucional (@alumnos.udg.mx o @academicos.udg.mx) o estar autorizada como administrador',
      'DOMAIN_NOT_ALLOWED',
    );
  }

  let user: UserRow | null = await findUserByGoogleSub(payload.sub);

  if (!user) {
    // Cubre el caso raro de que ya exista una fila con ese email pero sin
    // google_sub vinculado (p. ej. dato sembrado a mano en desarrollo).
    const byEmail = await findUserByEmail(payload.email);
    if (byEmail) {
      await linkGoogleSub(byEmail.id, payload.sub);
      user = { ...byEmail, google_sub: payload.sub };
    } else {
      user = await createGoogleUser({
        nombre: payload.name ?? payload.email,
        email: payload.email,
        google_sub: payload.sub,
        rol,
      });
    }
  }

  const needsOnboarding = user.rol === 'alumno' && user.codigo_cucei === null;
  return { ...signSessionToken(user), needsOnboarding };
}

const CODIGO_CUCEI_RE = /^\d{9}$/;

export async function completeAlumnoProfile(id_usuario: number, codigo_cucei: string) {
  if (!CODIGO_CUCEI_RE.test(codigo_cucei)) {
    throw badRequest('El código CUCEI debe tener exactamente 9 dígitos');
  }
  if (await isCodigoCuceiTaken(codigo_cucei)) {
    throw conflict('Ese código CUCEI ya está registrado', 'CODIGO_TAKEN');
  }
  await setUserCodigoCucei(id_usuario, codigo_cucei);
}
