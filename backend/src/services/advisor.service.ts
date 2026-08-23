import { withTransaction } from '../config/db.js';
import {
  findAdvisorProfileByUserId,
  upsertAdvisorProfile,
  replaceAdvisorAreas,
  searchAdvisors,
  type AdvisorProfileFull,
  type AdvisorSearchResult,
  type UpsertAdvisorData,
} from '../models/advisor.model.js';
import { notFound, badRequest } from '../utils/errors.js';

export interface UpdateAvailabilityBody {
  especialidad?: string | null;
  disponible?: boolean;
  cupo_maximo?: number;
  acepta_coasesoria?: boolean;
  areas?: number[];
}

/** Devuelve el perfil de disponibilidad del asesor autenticado. */
export async function getMyAvailability(id_usuario: number): Promise<AdvisorProfileFull> {
  const profile = await findAdvisorProfileByUserId(id_usuario);
  if (!profile) throw notFound('Perfil de asesor no encontrado', 'ADVISOR_PROFILE_NOT_FOUND');
  return profile;
}

/**
 * Crea o actualiza el perfil de disponibilidad del asesor en una transacción.
 * Reemplaza por completo las áreas.
 */
export async function updateMyAvailability(
  id_usuario: number,
  body: UpdateAvailabilityBody,
): Promise<AdvisorProfileFull> {
  if (body.cupo_maximo !== undefined) {
    if (!Number.isInteger(body.cupo_maximo) || body.cupo_maximo < 0) {
      throw badRequest('cupo_maximo debe ser un entero >= 0');
    }
  }

  const data: UpsertAdvisorData = {
    especialidad: body.especialidad,
    disponible: body.disponible,
    cupo_maximo: body.cupo_maximo,
    acepta_coasesoria: body.acepta_coasesoria,
  };

  await withTransaction(async (client) => {
    await upsertAdvisorProfile(client, id_usuario, data);
    if (body.areas !== undefined) {
      await replaceAdvisorAreas(client, id_usuario, body.areas);
    }
  });

  const updated = await findAdvisorProfileByUserId(id_usuario);
  return updated!;
}

/** Busca asesores disponibles con cupo libre. */
export async function searchAdvisorsService(
  areaId?: number,
): Promise<AdvisorSearchResult[]> {
  return searchAdvisors(areaId);
}
