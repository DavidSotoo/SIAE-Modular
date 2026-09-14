import pool from '../config/db.js';
import { updateProjectStateAndPdf, findProjectMentorId, findProjectPdfPath } from '../models/project.model.js';
import { insertStateLog, getProjectHistory as getHistoryDb } from '../models/stateLog.model.js';
import { isAlumnoInProject } from '../models/teamRequest.model.js';
import { getNextFolioSequence, insertFolio } from '../models/folio.model.js';
import { conflict, forbidden, badRequest, notFound } from '../utils/errors.js';

async function assertProjectAccess(
  id_proyecto: number,
  id_usuario: number,
  codigo_cucei: string,
  rol: string
): Promise<void> {
  if (rol === 'alumno') {
    const isMember = await isAlumnoInProject(id_proyecto, codigo_cucei);
    if (!isMember) throw forbidden('No eres miembro de este proyecto');
  } else if (rol === 'mentor') {
    const mentorId = await findProjectMentorId(id_proyecto);
    if (mentorId !== id_usuario) throw forbidden('No eres el mentor de este proyecto');
  } else if (rol !== 'admin') {
    throw forbidden('Rol no autorizado');
  }
}

export function generateFolioCode(sequence: number): string {
  const seqStr = sequence.toString().padStart(3, '0');
  const now = new Date();
  const yearStr = now.getFullYear().toString().slice(-2);
  const month = now.getMonth() + 1; // 1-12
  
  // Asunción confirmada: Enero(1)-Julio(7) = 'A', Agosto(8)-Diciembre(12) = 'B'
  const cycle = (month >= 1 && month <= 7) ? 'A' : 'B';
  
  return `A${seqStr}-${yearStr}${cycle}`;
}

export async function submitProtocol(
  id_proyecto: number,
  id_usuario: number,
  codigo_cucei: string,
  pdf_path: string
): Promise<void> {
  const isMember = await isAlumnoInProject(id_proyecto, codigo_cucei);
  if (!isMember) {
    throw forbidden('No eres miembro de este proyecto');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // El proyecto debe estar en 'borrador' o 'correccion'
    const updated = await updateProjectStateAndPdf(
      id_proyecto,
      ['borrador', 'correccion'],
      'pendiente',
      pdf_path,
      client
    );
    
    if (!updated) {
      throw conflict('El proyecto ya no está en el estado esperado, actualiza la página');
    }
    
    // Nota: El log no requiere saber exactamente el estado anterior en este helper,
    // o podemos insertarlo con NULL o con una consulta extra. Para simplicidad,
    // como solo queremos registrar la acción, ponemos estado_nuevo = 'pendiente'.
    // Idealmente el estado_anterior se recuperaría con SELECT FOR UPDATE.
    // Asumiremos que el frontend/history mostrará la transición lógicamente, o recuperamos:
    
    await insertStateLog(
      id_proyecto,
      null, // Simplificación: se omite el estado_anterior en el log o requiere fetch previo
      'pendiente',
      id_usuario,
      'Protocolo subido',
      client
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function approveProject(
  id_proyecto: number,
  id_mentor_solicitante: number
): Promise<{ codigo_folio: string }> {
  const mentorId = await findProjectMentorId(id_proyecto);
  if (mentorId !== id_mentor_solicitante) {
    throw forbidden('No eres el mentor asignado a este proyecto');
  }

  const client = await pool.connect();
  let generatedFolio = '';
  
  try {
    await client.query('BEGIN');
    
    const updated = await updateProjectStateAndPdf(
      id_proyecto,
      ['pendiente'],
      'registrado',
      undefined, // No actualiza el PDF
      client
    );
    
    if (!updated) {
      throw conflict('El proyecto ya no está en el estado esperado, actualiza la página');
    }
    
    const seq = await getNextFolioSequence(client);
    generatedFolio = generateFolioCode(seq);
    
    await insertFolio(generatedFolio, id_proyecto, client);
    
    await insertStateLog(
      id_proyecto,
      'pendiente',
      'registrado',
      id_mentor_solicitante,
      `Proyecto registrado. Folio: ${generatedFolio}`,
      client
    );
    
    await client.query('COMMIT');
    return { codigo_folio: generatedFolio };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function rejectProject(
  id_proyecto: number,
  id_mentor_solicitante: number,
  comentario: string
): Promise<void> {
  const mentorId = await findProjectMentorId(id_proyecto);
  if (mentorId !== id_mentor_solicitante) {
    throw forbidden('No eres el mentor asignado a este proyecto');
  }

  if (!comentario || comentario.trim().length === 0) {
    throw badRequest('El comentario de corrección es obligatorio');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const updated = await updateProjectStateAndPdf(
      id_proyecto,
      ['pendiente'],
      'correccion',
      undefined,
      client
    );
    
    if (!updated) {
      throw conflict('El proyecto ya no está en el estado esperado, actualiza la página');
    }
    
    await insertStateLog(
      id_proyecto,
      'pendiente',
      'correccion',
      id_mentor_solicitante,
      comentario.trim(),
      client
    );
    
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getProjectHistory(
  id_proyecto: number,
  id_usuario: number,
  codigo_cucei: string,
  rol: string
) {
  await assertProjectAccess(id_proyecto, id_usuario, codigo_cucei, rol);
  return await getHistoryDb(id_proyecto);
}

export async function getProtocolFilePath(
  id_proyecto: number,
  id_usuario: number,
  codigo_cucei: string,
  rol: string
): Promise<string> {
  await assertProjectAccess(id_proyecto, id_usuario, codigo_cucei, rol);

  const pdf_path = await findProjectPdfPath(id_proyecto);
  if (!pdf_path) {
    throw notFound('Este proyecto aún no tiene un protocolo subido');
  }
  return pdf_path;
}
