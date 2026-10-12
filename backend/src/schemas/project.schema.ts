import { z } from 'zod';

/**
 * Solo valida forma y tamanos defensivos. Las reglas de negocio (titulo de
 * hasta 20 palabras por IMF-02, descripcion de hasta 100) siguen en
 * project.service.ts, que es donde estan documentadas y probadas.
 */
export const crearProyectoBody = z.object({
  titulo: z.string().max(500, 'excede el largo maximo'),
  descripcion: z.string().max(5000, 'excede el largo maximo'),
});

export const rechazarProyectoBody = z.object({
  comentario: z.string().max(2000, 'excede el largo maximo'),
});
