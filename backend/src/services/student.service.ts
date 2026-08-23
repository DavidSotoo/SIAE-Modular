import { withTransaction } from '../config/db.js';
import {
  findProfileByUserId,
  upsertStudentProfile,
  replaceStudentSkills,
  replaceStudentInterests,
  searchStudents,
  type StudentProfileFull,
  type StudentSearchFilters,
} from '../models/student.model.js';
import { notFound, badRequest } from '../utils/errors.js';

export interface UpdateProfileBody {
  semestre?: number | null;
  bio?: string | null;
  portafolio_url?: string | null;
  disponibilidad?: string | null;
  estado_busqueda?: 'buscando_equipo' | 'en_equipo' | 'no_disponible';
  skills?: Array<{ id_skill: number; nivel: string }>;
  areas?: number[];
}

/** Devuelve el perfil del alumno autenticado. */
export async function getMyProfile(id_usuario: number): Promise<StudentProfileFull> {
  const profile = await findProfileByUserId(id_usuario);
  if (!profile) throw notFound('Perfil de alumno no encontrado', 'PROFILE_NOT_FOUND');
  return profile;
}

/**
 * Crea o actualiza el perfil del alumno en una transacción.
 * Reemplaza por completo skills y áreas de interés.
 */
export async function updateMyProfile(
  id_usuario: number,
  body: UpdateProfileBody,
): Promise<StudentProfileFull> {
  const VALID_SKILLS_NIVEL = ['basico', 'intermedio', 'avanzado'];
  const VALID_DISPONIBILIDAD = [
    'tiempo_completo',
    'medio_tiempo',
    'fines_de_semana',
    'flexible',
  ];
  const VALID_ESTADO = ['buscando_equipo', 'en_equipo', 'no_disponible'];

  if (body.disponibilidad && !VALID_DISPONIBILIDAD.includes(body.disponibilidad)) {
    throw badRequest(`disponibilidad inválida: ${body.disponibilidad}`);
  }
  if (body.estado_busqueda && !VALID_ESTADO.includes(body.estado_busqueda)) {
    throw badRequest(`estado_busqueda inválido: ${body.estado_busqueda}`);
  }
  if (body.semestre !== undefined && body.semestre !== null) {
    if (!Number.isInteger(body.semestre) || body.semestre < 1 || body.semestre > 12) {
      throw badRequest('semestre debe ser un entero entre 1 y 12');
    }
  }
  if (body.skills) {
    for (const sk of body.skills) {
      if (!Number.isInteger(sk.id_skill) || sk.id_skill < 1) {
        throw badRequest(`id_skill inválido: ${sk.id_skill}`);
      }
      if (!VALID_SKILLS_NIVEL.includes(sk.nivel)) {
        throw badRequest(`nivel de skill inválido: ${sk.nivel}`);
      }
    }
  }

  await withTransaction(async (client) => {
    await upsertStudentProfile(client, id_usuario, {
      semestre: body.semestre,
      bio: body.bio,
      portafolio_url: body.portafolio_url,
      disponibilidad: body.disponibilidad,
      estado_busqueda: body.estado_busqueda,
    });

    if (body.skills !== undefined) {
      await replaceStudentSkills(client, id_usuario, body.skills);
    }
    if (body.areas !== undefined) {
      await replaceStudentInterests(client, id_usuario, body.areas);
    }
  });

  const updated = await findProfileByUserId(id_usuario);
  return updated!;
}

/** Búsqueda de alumnos con filtros opcionales. */
export async function searchStudentsService(
  filters: StudentSearchFilters,
): Promise<StudentProfileFull[]> {
  return searchStudents(filters);
}
