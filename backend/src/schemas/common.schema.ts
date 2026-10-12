import { z } from 'zod';

/** Id de base de datos: entero positivo, recibido como texto en la URL. */
export const idEntero = z
  .string()
  .regex(/^\d+$/, 'debe ser un entero positivo')
  .transform(Number)
  .refine((n) => n > 0 && Number.isSafeInteger(n), 'debe ser un entero positivo');

export const paramsIdProyecto = z.object({ id_proyecto: idEntero });
export const paramsIdSolicitud = z.object({ id_solicitud: idEntero });
export const paramsIdMentor = z.object({ id_mentor: idEntero });

/** Codigo CUCEI: exactamente 9 digitos (solo lo tienen los alumnos). */
export const codigoCucei = z.string().regex(/^\d{9}$/, 'debe tener 9 digitos');
