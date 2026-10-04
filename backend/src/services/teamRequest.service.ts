import { withTransaction } from '../config/db.js';
import {
  findTeamRequestById,
  findTeamRequestsByProject,
  findTeamRequestsByStudent,
  findPendingTeamRequest,
  isAlumnoInProject,
  countProjectMembers,
  hasActiveProject,
  createTeamRequest,
  updateTeamRequestEstado,
  insertProjectMember,
  cancelPendingTeamRequests,
  findUserIdByCodigo,
  type TeamRequest,
  type TeamRequestTipo,
} from '../models/teamRequest.model.js';
import { updateEstadoBusqueda } from '../models/student.model.js';
import { badRequest, notFound, conflict, forbidden } from '../utils/errors.js';

// SM-40: equipo de hasta 5 integrantes (incluyendo a quien crea el proyecto)
export const MAX_MEMBERS = 5;

export interface CreateTeamRequestBody {
  /**
   * Solo requerido cuando tipo === 'invitacion'.
   * Para tipo === 'solicitud' se ignora: el alumno que se quiere unir ES el emisor.
   */
  codigo_alumno?: string;
  tipo: TeamRequestTipo;
  mensaje?: string | null;
}

/**
 * Crea una solicitud de equipo aplicando todas las reglas de negocio.
 *
 * Semántica de tipo:
 *   'invitacion' — un integrante del proyecto (emisor) invita a un alumno externo.
 *                  El alumno que se unirá si se acepta = codigo_alumno_receptor (el invitado).
 *                  Solo el receptor puede aceptar.
 *   'solicitud'  — un alumno externo pide unirse al proyecto.
 *                  El alumno que se unirá si se acepta = codigo_alumno_emisor (quien pide).
 *                  Cualquier integrante actual del proyecto puede aceptar.
 *
 * Emisor y receptor se asignan según el tipo para que la semántica
 * de permisos y la inserción del nuevo miembro sean correctas.
 * El emisor de una invitación debe ser integrante del proyecto.
 */
export async function createTeamRequestService(
  id_proyecto: number,
  emisorCodigo: string,
  body: CreateTeamRequestBody,
): Promise<TeamRequest> {
  if (!['invitacion', 'solicitud'].includes(body.tipo)) {
    throw badRequest('tipo debe ser "invitacion" o "solicitud"');
  }

  // ── Determinar emisor y receptor según el tipo ────────────────────────────
  let receptorCodigo: string;

  if (body.tipo === 'invitacion') {
    // Un alumno externo no puede invitar en nombre de un proyecto al que no pertenece
    const emisorEsMiembro = await isAlumnoInProject(id_proyecto, emisorCodigo);
    if (!emisorEsMiembro) {
      throw forbidden(
        'Solo un integrante del proyecto puede enviar invitaciones',
        'NOT_PROJECT_MEMBER',
      );
    }

    if (!body.codigo_alumno) {
      throw badRequest('codigo_alumno es requerido para tipo "invitacion"');
    }
    if (emisorCodigo === body.codigo_alumno) {
      throw badRequest('No puedes invitarte a ti mismo');
    }
    receptorCodigo = body.codigo_alumno;
  } else {
    // tipo === 'solicitud': el emisor quiere unirse, no se necesita codigo_alumno
    // El "receptor" en la fila es un placeholder representativo del equipo;
    // usamos el emisor como receptor para que el índice parcial único
    // (id_proyecto, codigo_alumno_receptor) prevenga duplicados correctamente.
    //
    // Convención: emisor = quien pide, receptor = emisor (mismo alumno).
    // Esto significa: "el alumno <emisor> quiere unirse al proyecto <id_proyecto>".
    receptorCodigo = emisorCodigo;
  }

  // ── Validaciones comunes (sobre el alumno que SE VA A UNIR) ──────────────

  // El alumno que se unirá no debe ser ya miembro
  const candidatoCodigo = body.tipo === 'invitacion' ? receptorCodigo : emisorCodigo;

  const yaEsMiembro = await isAlumnoInProject(id_proyecto, candidatoCodigo);
  if (yaEsMiembro) {
    throw conflict('El alumno ya es integrante del proyecto', 'ALREADY_MEMBER');
  }

  // Proyecto no debe estar lleno
  const memberCount = await countProjectMembers(id_proyecto);
  if (memberCount >= MAX_MEMBERS) {
    throw conflict(`El proyecto ya tiene el máximo de integrantes (${MAX_MEMBERS})`, 'PROJECT_FULL');
  }

  // El candidato no debe tener otro proyecto activo
  const candidatoActivo = await hasActiveProject(candidatoCodigo);
  if (candidatoActivo) {
    throw conflict('El alumno ya tiene un proyecto activo', 'ALUMNO_HAS_PROJECT');
  }

  // No duplicar solicitud pendiente para este par (proyecto, receptor)
  const existing = await findPendingTeamRequest(id_proyecto, receptorCodigo);
  if (existing) {
    throw conflict(
      'Ya existe una solicitud pendiente para este alumno en este proyecto',
      'DUPLICATE_REQUEST',
    );
  }

  return withTransaction(async (client) => {
    return createTeamRequest(client, {
      id_proyecto,
      codigo_alumno_emisor: emisorCodigo,
      codigo_alumno_receptor: receptorCodigo,
      tipo: body.tipo,
      mensaje: body.mensaje,
    });
  });
}

/**
 * Devuelve las solicitudes de equipo de un proyecto.
 * Solo accesible para integrantes del proyecto, ya que las solicitudes
 * pueden incluir mensajes privados entre miembros.
 *
 * @param callerCodigo  codigo_cucei del alumno autenticado
 */
export async function getTeamRequestsByProject(
  id_proyecto: number,
  callerCodigo: string,
): Promise<TeamRequest[]> {
  const esMiembro = await isAlumnoInProject(id_proyecto, callerCodigo);
  if (!esMiembro) {
    throw forbidden(
      'Solo un integrante del proyecto puede ver sus solicitudes de equipo',
      'NOT_PROJECT_MEMBER',
    );
  }
  return findTeamRequestsByProject(id_proyecto);
}

export async function getMyTeamRequests(codigo_alumno: string): Promise<TeamRequest[]> {
  return findTeamRequestsByStudent(codigo_alumno);
}

/**
 * Acepta una solicitud de equipo.
 *
 * Permisos por tipo:
 *   'invitacion' → solo el receptor (el invitado) puede aceptar.
 *   'solicitud'  → cualquier integrante del proyecto puede aceptar.
 *
 * En ambos casos el nuevo miembro que se inserta es:
 *   'invitacion' → codigo_alumno_receptor
 *   'solicitud'  → codigo_alumno_emisor
 */
export async function acceptTeamRequest(
  id_solicitud: number,
  callerCodigo: string,
): Promise<void> {
  const solicitud = await findTeamRequestById(id_solicitud);
  if (!solicitud) throw notFound('Solicitud no encontrada');
  if (solicitud.estado !== 'pendiente') {
    throw badRequest(`No se puede aceptar una solicitud en estado "${solicitud.estado}"`);
  }

  // Los permisos de quién puede aceptar dependen del tipo de solicitud:
  // invitacion → solo el destinatario; solicitud → cualquier miembro del proyecto
  if (solicitud.tipo === 'invitacion') {
    if (solicitud.codigo_alumno_receptor !== callerCodigo) {
      throw forbidden('Solo el alumno invitado puede aceptar la invitación');
    }
  } else {
    // tipo === 'solicitud': debe ser integrante del proyecto
    const callerEsMiembro = await isAlumnoInProject(solicitud.id_proyecto, callerCodigo);
    if (!callerEsMiembro) {
      throw forbidden('Solo un integrante del proyecto puede aceptar esta solicitud');
    }
  }

  // El alumno que se integra al equipo depende del tipo:
  // invitacion → el receptor (el invitado); solicitud → el emisor (quien pidió unirse)
  const nuevoCodigo =
    solicitud.tipo === 'invitacion'
      ? solicitud.codigo_alumno_receptor
      : solicitud.codigo_alumno_emisor;

  const nuevoUserId = await findUserIdByCodigo(nuevoCodigo);
  if (!nuevoUserId) throw notFound('Usuario no encontrado');

  await withTransaction(async (client) => {
    // Las validaciones de la creación pudieron cambiar desde entonces (otro
    // alumno ocupó el último lugar, o este alumno ya se unió a otro proyecto).
    // Se bloquean el proyecto y el alumno para serializar aceptaciones
    // simultáneas y se vuelve a validar con los datos actuales.
    await client.query('SELECT 1 FROM projects WHERE id_proyecto = $1 FOR UPDATE', [solicitud.id_proyecto]);
    await client.query('SELECT 1 FROM users WHERE codigo_cucei = $1 FOR UPDATE', [nuevoCodigo]);

    if (await countProjectMembers(solicitud.id_proyecto, client) >= MAX_MEMBERS) {
      throw conflict(`El proyecto ya tiene el máximo de integrantes (${MAX_MEMBERS})`, 'PROJECT_FULL');
    }
    if (await hasActiveProject(nuevoCodigo, client)) {
      throw conflict('El alumno ya tiene un proyecto activo', 'ALUMNO_HAS_PROJECT');
    }

    // 1. Insertar el nuevo miembro correcto
    await insertProjectMember(client, solicitud.id_proyecto, nuevoCodigo);

    // 2. Marcar solicitud como aceptada
    await updateTeamRequestEstado(client, id_solicitud, 'aceptada');

    // 3. Actualizar estado_busqueda del alumno que se une
    await updateEstadoBusqueda(client, nuevoUserId, 'en_equipo');

    // 4. Si el proyecto quedó lleno, cancelar las demás pendientes
    const newCount = await client.query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM project_members WHERE id_proyecto = $1',
      [solicitud.id_proyecto],
    );
    const total = parseInt(newCount.rows[0].count, 10);
    if (total >= MAX_MEMBERS) {
      await cancelPendingTeamRequests(client, solicitud.id_proyecto, id_solicitud);
    }
  });
}

/**
 * Rechaza una solicitud.
 *
 * Permisos por tipo:
 *   'invitacion' → solo el receptor (el invitado) puede rechazar.
 *   'solicitud'  → cualquier integrante del proyecto puede rechazar.
 */
export async function rejectTeamRequest(
  id_solicitud: number,
  callerCodigo: string,
): Promise<void> {
  const solicitud = await findTeamRequestById(id_solicitud);
  if (!solicitud) throw notFound('Solicitud no encontrada');
  if (solicitud.estado !== 'pendiente') {
    throw badRequest(`No se puede rechazar una solicitud en estado "${solicitud.estado}"`);
  }

  // Los permisos de quién puede rechazar son simétricos a los de aceptar
  if (solicitud.tipo === 'invitacion') {
    if (solicitud.codigo_alumno_receptor !== callerCodigo) {
      throw forbidden('Solo el alumno invitado puede rechazar la invitación');
    }
  } else {
    const callerEsMiembro = await isAlumnoInProject(solicitud.id_proyecto, callerCodigo);
    if (!callerEsMiembro) {
      throw forbidden('Solo un integrante del proyecto puede rechazar esta solicitud');
    }
  }

  await withTransaction(async (client) => {
    await updateTeamRequestEstado(client, id_solicitud, 'rechazada');
  });
}

/** Cancela una solicitud (solo el emisor puede cancelarla — invariante para ambos tipos). */
export async function cancelTeamRequest(
  id_solicitud: number,
  callerCodigo: string,
): Promise<void> {
  const solicitud = await findTeamRequestById(id_solicitud);
  if (!solicitud) throw notFound('Solicitud no encontrada');
  if (solicitud.estado !== 'pendiente') {
    throw badRequest(`No se puede cancelar una solicitud en estado "${solicitud.estado}"`);
  }
  if (solicitud.codigo_alumno_emisor !== callerCodigo) {
    throw forbidden('Solo el emisor puede cancelar la solicitud');
  }

  await withTransaction(async (client) => {
    await updateTeamRequestEstado(client, id_solicitud, 'cancelada');
  });
}
