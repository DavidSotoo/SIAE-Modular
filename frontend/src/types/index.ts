// ─────────────────────────────────────────────────────────────────────────────
// SIAE-Modular — Tipos compartidos para consumo desde el frontend
// Corresponden a los DTOs de los endpoints del módulo Team Matching &
// Advisor Availability.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Catálogos ───────────────────────────────────────────────────────────────

export type SkillTipo = 'hard' | 'soft';
export type NivelSkill = 'basico' | 'intermedio' | 'avanzado';

export interface Skill {
  id_skill: number;
  nombre: string;
  tipo: SkillTipo;
}

export interface Area {
  id_area: number;
  nombre: string;
}

// ─── Perfil de alumno ────────────────────────────────────────────────────────

export type DisponibilidadTipo =
  | 'tiempo_completo'
  | 'medio_tiempo'
  | 'fines_de_semana'
  | 'flexible';

export type EstadoBusqueda = 'buscando_equipo' | 'en_equipo' | 'no_disponible';

export interface StudentSkill {
  id_skill: number;
  nombre: string;
  tipo: SkillTipo;
  nivel: NivelSkill;
}

export interface StudentProfile {
  id_usuario: number;
  codigo_cucei: string;
  nombre: string;
  foto_url: string | null;
  semestre: number | null;
  bio: string | null;
  portafolio_url: string | null;
  disponibilidad: DisponibilidadTipo | null;
  estado_busqueda: EstadoBusqueda;
  updated_at: string;
  skills: StudentSkill[];
  areas: Area[];
}

/** Body para PUT /api/students/me/profile */
export interface StudentProfileUpdate {
  semestre?: number | null;
  bio?: string | null;
  portafolio_url?: string | null;
  disponibilidad?: DisponibilidadTipo | null;
  estado_busqueda?: EstadoBusqueda;
  skills?: Array<{ id_skill: number; nivel: NivelSkill }>;
  areas?: number[];
}

/** Resultado de GET /api/students/search */
export type StudentSearchResult = StudentProfile;

// ─── Proyectos ───────────────────────────────────────────────────────────────

export type ProjectState = 'borrador' | 'pendiente' | 'validado' | 'registrado' | 'correccion' | 'cancelado';

/** Representa un proyecto y sus integrantes actuales. */
export interface Project {
  id_proyecto: number;
  titulo: string;
  descripcion?: string | null;
  estado_actual: ProjectState;
  codigo_folio?: string | null;
  pdf_path?: string | null;
  pdf_visualizado?: boolean;
  id_mentor: number | null;
  created_at: string;
  miembros: Array<{
    codigo_cucei: string;
    nombre: string;
  }>;
}

export interface ProjectStateLog {
  id_log: number;
  estado_anterior: ProjectState | null;
  estado_nuevo: ProjectState;
  timestamp: string;
  comentario: string | null;
}

// ─── Team Requests ───────────────────────────────────────────────────────────

export type TeamRequestTipo = 'invitacion' | 'solicitud';
export type TeamRequestEstado = 'pendiente' | 'aceptada' | 'rechazada' | 'cancelada';

export interface TeamRequest {
  id_solicitud: number;
  id_proyecto: number;
  codigo_alumno_emisor: string;
  codigo_alumno_receptor: string;
  tipo: TeamRequestTipo;
  mensaje: string | null;
  estado: TeamRequestEstado;
  /**
   * Alumno que se integrará al equipo si la solicitud es aceptada.
   * Campo calculado por el backend:
   *   tipo='invitacion' → codigo_alumno_receptor (el invitado se une)
   *   tipo='solicitud'  → codigo_alumno_emisor   (quien solicita se une)
   */
  codigo_alumno_candidato: string;
  created_at: string;
  updated_at: string;
}

/** Body para POST /api/projects/:id_proyecto/team-requests */
export interface TeamRequestCreate {
  /**
   * Solo requerido cuando tipo === 'invitacion'.
   * Para tipo === 'solicitud', el alumno que se une es el propio caller — omitir.
   */
  codigo_alumno?: string;
  tipo: TeamRequestTipo;
  mensaje?: string | null;
}

// ─── Perfil de asesor ────────────────────────────────────────────────────────

export interface AdvisorProfile {
  id_usuario: number;
  codigo_cucei: string;
  nombre: string;
  especialidad: string | null;
  disponible: boolean;
  cupo_maximo: number;
  acepta_coasesoria: boolean;
  updated_at: string;
  areas: Area[];
}

/** Body para PUT /api/advisors/me/availability */
export interface AdvisorProfileUpdate {
  especialidad?: string | null;
  disponible?: boolean;
  cupo_maximo?: number;
  acepta_coasesoria?: boolean;
  areas?: number[];
}

/** Resultado de GET /api/advisors/search (incluye proyectos activos actuales) */
export interface AdvisorSearchResult extends AdvisorProfile {
  proyectos_activos: number;
}

// ─── Advisor Requests ────────────────────────────────────────────────────────

export type AdvisorRequestEstado = 'pendiente' | 'aceptada' | 'rechazada' | 'cancelada';

export interface AdvisorRequest {
  id_solicitud: number;
  id_proyecto: number;
  id_mentor: number;
  mensaje: string | null;
  estado: AdvisorRequestEstado;
  created_at: string;
  updated_at: string;
  /** Solo presente en GET /mentors/me/advisor-requests */
  titulo_proyecto?: string;
}

/** Body para POST /api/projects/:id_proyecto/advisor-requests */
export interface AdvisorRequestCreate {
  id_mentor: number;
  mensaje?: string | null;
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export interface AdminProjectRow {
  id_proyecto: number;
  titulo: string;
  estado_actual: ProjectState;
  codigo_folio: string | null;
  fecha_folio: string | null;
  id_mentor: number | null;
  mentor_nombre: string | null;
  num_integrantes: number;
  created_at: string;
  updated_at: string;
}

export interface AdminProjectDetail extends AdminProjectRow {
  descripcion: string | null;
  miembros: Array<{ codigo_cucei: string; nombre: string }>;
  historial: ProjectStateLog[];
}

export interface AdminProjectFilters {
  estado?: ProjectState;
  search?: string;
}

export interface AdminStats {
  total_proyectos: number;
  por_estado: Record<string, number>;
  total_folios: number;
}

// ─── Respuesta de error ──────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  code?: string;
}
