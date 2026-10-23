// Configuracion compartida entre playwright.config.ts, la siembra y las pruebas.
export const E2E = {
  backendPort: 4100,
  // 5188 esta en la lista de origenes de desarrollo que acepta el CORS del backend.
  frontendPort: 5188,
  get backendUrl() {
    return `http://localhost:${this.backendPort}`;
  },
  get frontendUrl() {
    return `http://localhost:${this.frontendPort}`;
  },
  // Por defecto, la base de docker-compose; en CI se sobrescribe con DATABASE_URL.
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgresql://siae_admin:siae_dev_password@127.0.0.1:15432/siae_modular',
  jwtSecret: process.env.E2E_JWT_SECRET ?? 'secreto_solo_para_e2e',
} as const;

/**
 * Usuarios de prueba. El prefijo 98 en el codigo y "E2E-" en el nombre los
 * aislan de los datos reales y de las pruebas de backend (que usan 99).
 */
export const USUARIOS = {
  alumnaConProyecto: { codigo: '980000001', nombre: 'E2E-Ana Alumna', rol: 'alumno' },
  alumnoSinProyecto: { codigo: '980000002', nombre: 'E2E-Beto Alumno', rol: 'alumno' },
  mentor: { codigo: '980000101', nombre: 'E2E-Mario Mentor', rol: 'mentor' },
  admin: { codigo: '980000201', nombre: 'E2E-Admin', rol: 'admin' },
  // Dos alumnos sin codigo CUCEI (primer login con Google): uno para auditar
  // la vista y otro para completar el perfil, asi el orden no importa.
  onboardingAuditoria: { codigo: null, nombre: 'E2E-Onboarding Auditoria', rol: 'alumno' },
  onboardingFlujo: { codigo: null, nombre: 'E2E-Onboarding Flujo', rol: 'alumno' },
} as const;

export type ClaveUsuario = keyof typeof USUARIOS;

export const TITULO_PROYECTO = 'E2E-Sistema de monitoreo de laboratorios';

/** Foto de perfil del alumno sin proyecto; las pruebas siempre la responden con 404. */
export const FOTO_ROTA = 'https://lh3.googleusercontent.com/e2e-foto-rota';

/** Codigo que captura el alumno de onboarding durante la prueba. */
export const CODIGO_ONBOARDING = '980000777';

/** Archivo donde la siembra deja las sesiones (id, token) de cada usuario. */
export const ARCHIVO_SESIONES = 'e2e/.sesiones.json';
