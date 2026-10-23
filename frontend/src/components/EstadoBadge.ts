// Insignia de estado del proyecto. Unico lugar donde se decide como se ve y
// como se llama cada estado del motor: antes cada pagina armaba la clase a
// mano e imprimia el codigo crudo ("pendiente", "validado").
import type { ProjectState } from '../types/index.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { icono, type NombreIcono } from '../utils/iconos.js';

interface Estado {
  etiqueta: string;
  icono: NombreIcono;
  /** Que significa para quien lo lee: se usa como title y para lectores de pantalla. */
  descripcion: string;
}

const ESTADOS: Record<ProjectState, Estado> = {
  borrador: {
    etiqueta: 'Borrador',
    icono: 'edit_note',
    descripcion: 'Aún no se ha subido el protocolo',
  },
  pendiente: {
    etiqueta: 'Pendiente de revisión',
    icono: 'hourglass_top',
    descripcion: 'El asesor todavía no revisa el protocolo',
  },
  correccion: {
    etiqueta: 'Requiere correcciones',
    icono: 'error',
    descripcion: 'El asesor pidió cambios antes de aprobarlo',
  },
  validado: {
    etiqueta: 'Validado',
    icono: 'task_alt',
    descripcion: 'Aprobado por el asesor, falta el folio de administración',
  },
  registrado: {
    etiqueta: 'Registrado',
    icono: 'verified',
    descripcion: 'Registrado oficialmente con folio',
  },
  cancelado: {
    etiqueta: 'Cancelado',
    icono: 'cancel',
    descripcion: 'El proyecto ya no está activo',
  },
};

/** Texto legible de un estado, para usar fuera de una insignia (historial, avisos). */
export function etiquetaDeEstado(estado: ProjectState | null | undefined): string {
  if (!estado) return 'Sin estado';
  return ESTADOS[estado]?.etiqueta ?? estado;
}

/** Devuelve el HTML de la insignia. El llamador lo inserta donde corresponda. */
export function estadoBadge(estado: ProjectState): string {
  const info = ESTADOS[estado];
  if (!info) {
    // Estado que el backend conoce y el frontend todavia no: se muestra el
    // codigo en vez de romper la vista.
    return `<span class="badge">${escapeHtml(estado)}</span>`;
  }
  return (
    `<span class="badge badge--${estado}" title="${escapeHtml(info.descripcion)}">` +
    icono(info.icono) +
    `${escapeHtml(info.etiqueta)}</span>`
  );
}
