import { withTransaction } from '../config/db.js';
import {
  findAdvisorRequestById,
  findAdvisorRequestsByMentor,
  findPendingAdvisorRequest,
  createAdvisorRequest,
  updateAdvisorRequestEstado,
  assignMentorToProject,
  cancelPendingAdvisorRequests,
  type AdvisorRequest,
} from '../models/advisorRequest.model.js';
import { advisorHasCupo } from '../models/advisor.model.js';
import { isAlumnoInProject } from '../models/teamRequest.model.js';
import { findProjectMentorId } from '../models/project.model.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/errors.js';

export interface CreateAdvisorRequestBody {
  id_mentor: number;
  mensaje?: string | null;
}

/**
 * Crea una solicitud de asesoría validando:
 * - el caller es integrante del proyecto
 * - el proyecto no tiene ya un mentor asignado
 * - el mentor tiene disponible=true y cupo libre
 * - no existe solicitud pendiente duplicada para el par (proyecto, mentor)
 *
 * @param callerCodigo  codigo_cucei del alumno autenticado (req.user.codigo_cucei)
 */
export async function createAdvisorRequestService(
  id_proyecto: number,
  body: CreateAdvisorRequestBody,
  callerCodigo: string,
): Promise<AdvisorRequest> {
  if (!body.id_mentor || !Number.isInteger(body.id_mentor)) {
    throw badRequest('id_mentor es requerido y debe ser un entero');
  }

  // Solo miembros del proyecto pueden solicitar asesoría en su nombre
  const callerEsMiembro = await isAlumnoInProject(id_proyecto, callerCodigo);
  if (!callerEsMiembro) {
    throw forbidden(
      'Solo un integrante del proyecto puede solicitar asesoría',
      'NOT_PROJECT_MEMBER',
    );
  }

  // Si el proyecto no existe, project.model lanza notFound directamente.
  // Aquí solo verificamos la regla de negocio: el proyecto no debe tener mentor aún.
  const mentorActual = await findProjectMentorId(id_proyecto);
  if (mentorActual !== null) {
    throw conflict('El proyecto ya tiene un asesor asignado', 'ALREADY_HAS_MENTOR');
  }

  // Validar cupo y disponibilidad del mentor (fuera de tx, sin bloqueo — solo preflight)
  const tieneCupo = await advisorHasCupo(body.id_mentor);
  if (!tieneCupo) {
    throw conflict(
      'El asesor no está disponible o no tiene cupo',
      'ADVISOR_NO_CUPO',
    );
  }

  // Verificar solicitud duplicada
  const existing = await findPendingAdvisorRequest(id_proyecto, body.id_mentor);
  if (existing) {
    throw conflict(
      'Ya existe una solicitud de asesoría pendiente para este asesor y proyecto',
      'DUPLICATE_ADVISOR_REQUEST',
    );
  }

  return withTransaction(async (client) => {
    return createAdvisorRequest(client, {
      id_proyecto,
      id_mentor: body.id_mentor,
      mensaje: body.mensaje,
    });
  });
}

export async function getMentorAdvisorRequests(
  id_mentor: number,
): Promise<AdvisorRequest[]> {
  return findAdvisorRequestsByMentor(id_mentor);
}

/**
 * Acepta la solicitud de asesoría:
 * 1. Dentro de la transacción: bloquea la fila del asesor con FOR UPDATE
 *    para garantizar que la re-verificación de cupo es serializada
 * 3. Asigna el mentor al proyecto solo si id_mentor IS NULL
 * 4. Si ya había mentor (rowCount=0), lanza conflict y hace rollback
 * 5. Marca la solicitud como 'aceptada'
 * 6. Cancela las demás solicitudes pendientes del proyecto con estado='cancelada'
 */
export async function acceptAdvisorRequest(
  id_solicitud: number,
  callerUserId: number,
): Promise<void> {
  const solicitud = await findAdvisorRequestById(id_solicitud);
  if (!solicitud) throw notFound('Solicitud de asesoría no encontrada');
  if (solicitud.estado !== 'pendiente') {
    throw badRequest(`No se puede aceptar una solicitud en estado "${solicitud.estado}"`);
  }
  if (solicitud.id_mentor !== callerUserId) {
    throw forbidden('Solo el asesor destinatario puede aceptar la solicitud');
  }

  await withTransaction(async (client) => {
    // Bloquear la fila del asesor antes de contar proyectos activos evita que dos
    // aceptaciones concurrentes lean el mismo cupo disponible antes de que alguna escriba
    const tieneCupo = await advisorHasCupo(solicitud.id_mentor, client, true);
    if (!tieneCupo) {
      throw conflict('Ya no tienes cupo disponible', 'ADVISOR_NO_CUPO');
    }

    // Condición WHERE id_mentor IS NULL en el UPDATE evita sobrescribir silenciosamente
    // a un mentor ya asignado si dos solicitudes se aceptan casi al mismo tiempo
    const rowCount = await assignMentorToProject(client, solicitud.id_proyecto, solicitud.id_mentor);
    if (rowCount === 0) {
      // Otro proceso ganó la carrera — el proyecto ya tiene mentor
      throw conflict('El proyecto ya tiene un asesor asignado', 'ALREADY_HAS_MENTOR');
    }

    // Marcar como aceptada
    await updateAdvisorRequestEstado(client, id_solicitud, 'aceptada');

    // Estado 'cancelada' (no 'rechazada') porque el mentor no las rechazó activamente;
    // simplemente el proyecto ya encontró su asesor
    await cancelPendingAdvisorRequests(client, solicitud.id_proyecto, id_solicitud);
  });
}

/** Rechaza la solicitud (solo el mentor destinatario). */
export async function rejectAdvisorRequest(
  id_solicitud: number,
  callerUserId: number,
): Promise<void> {
  const solicitud = await findAdvisorRequestById(id_solicitud);
  if (!solicitud) throw notFound('Solicitud de asesoría no encontrada');
  if (solicitud.estado !== 'pendiente') {
    throw badRequest(`No se puede rechazar una solicitud en estado "${solicitud.estado}"`);
  }
  if (solicitud.id_mentor !== callerUserId) {
    throw forbidden('Solo el asesor destinatario puede rechazar la solicitud');
  }

  await withTransaction(async (client) => {
    await updateAdvisorRequestEstado(client, id_solicitud, 'rechazada');
  });
}
