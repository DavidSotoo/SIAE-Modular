import { withTransaction } from '../config/db.js';
import { createProject, findActiveProjectByAlumno, ProjectWithMembers } from '../models/project.model.js';
import { insertProjectMember, hasActiveProject } from '../models/teamRequest.model.js';
import { updateEstadoBusqueda, findProfileByUserId } from '../models/student.model.js';
import { conflict, badRequest } from '../utils/errors.js';

export async function createStudentProject(
  id_usuario: number,
  codigo_alumno: string,
  titulo: string,
): Promise<ProjectWithMembers> {
  if (!titulo || titulo.trim().length === 0) {
    throw badRequest('El título del proyecto es requerido.');
  }
  // Sprint 2 de Diseño, sección 5.1 (condición de Borrador -> Pendiente): título <= 20 palabras.
  const wordCount = titulo.trim().split(/\s+/).length;
  if (wordCount > 20) {
    throw badRequest('El título del proyecto no debe exceder 20 palabras.');
  }

  const alreadyHas = await hasActiveProject(codigo_alumno);
  if (alreadyHas) {
    throw conflict('Ya tienes un proyecto activo', 'ALREADY_HAS_PROJECT');
  }

  await withTransaction(async (client) => {
    // 1. Create project
    const proj = await createProject(client, titulo.trim());
    
    // 2. Add creator to project_members
    await insertProjectMember(client, proj.id_proyecto, codigo_alumno);
    
    // 3. Update student state
    await updateEstadoBusqueda(client, id_usuario, 'en_equipo');
  });

  const created = await findActiveProjectByAlumno(codigo_alumno);
  return created!;
}

export async function getMyActiveProject(
  codigo_alumno: string,
): Promise<ProjectWithMembers | null> {
  return findActiveProjectByAlumno(codigo_alumno);
}