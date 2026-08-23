// ─── Error Messages ──────────────────────────────────────────────────────────
// Mapeo centralizado de códigos de error del backend a mensajes amigables en español.
// Diseñado para ser extensible: agregar nuevos códigos aquí afecta todos los componentes.

/** Código de error devuelto por el backend en { error, code } */
type ApiErrorCode = string;

const ERROR_MESSAGES: Record<string, string> = {
  // Team Requests
  ALREADY_MEMBER:        'Este alumno ya es integrante del proyecto.',
  PROJECT_FULL:          'El proyecto ya alcanzó el máximo de 3 integrantes.',
  ALUMNO_HAS_PROJECT:    'El alumno ya tiene un proyecto activo y no puede unirse a otro.',
  DUPLICATE_REQUEST:     'Ya existe una solicitud pendiente para este alumno en este proyecto.',
  NOT_PROJECT_MEMBER:    'Debes ser integrante del proyecto para realizar esta acción.',

  // Advisor Requests
  ADVISOR_NO_CUPO:           'El asesor no está disponible o no tiene cupo libre en este momento.',
  DUPLICATE_ADVISOR_REQUEST: 'Ya enviaste una solicitud de asesoría a este mentor para este proyecto.',
  ALREADY_HAS_MENTOR:        'El proyecto ya tiene un asesor asignado.',

  // Genéricos HTTP
  UNAUTHORIZED:   'Tu sesión expiró. Por favor inicia sesión nuevamente.',
  FORBIDDEN:      'No tienes permiso para realizar esta acción.',
  NOT_FOUND:      'El recurso solicitado no fue encontrado.',
  CONFLICT:       'Hubo un conflicto con el estado actual del recurso.',
};

const GENERIC_SERVER_ERROR = 'Ocurrió un error en el servidor. Inténtalo más tarde.';
const GENERIC_CLIENT_ERROR = 'Ocurrió un error inesperado. Verifica tu conexión.';

/**
 * Devuelve el mensaje amigable para un código/mensaje de error del backend.
 * Si no hay un mapeo para el código, devuelve un mensaje genérico según el status HTTP.
 *
 * @param code    Código de error del backend (opcional)
 * @param status  Código HTTP (opcional, para fallback genérico)
 */
export function getErrorMessage(code?: ApiErrorCode, status?: number): string {
  if (code && code in ERROR_MESSAGES) {
    return ERROR_MESSAGES[code];
  }
  if (status) {
    if (status === 401) return ERROR_MESSAGES.UNAUTHORIZED;
    if (status === 403) return ERROR_MESSAGES.FORBIDDEN;
    if (status === 404) return ERROR_MESSAGES.NOT_FOUND;
    if (status === 409) return ERROR_MESSAGES.CONFLICT;
    if (status >= 500)  return GENERIC_SERVER_ERROR;
  }
  return GENERIC_CLIENT_ERROR;
}
