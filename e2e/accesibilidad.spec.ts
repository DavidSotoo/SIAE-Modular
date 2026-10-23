// Auditoria automatica con axe de cada vista, en tema claro y oscuro. Protege
// lo logrado en la Fase 2 (0 violaciones en todas las vistas).
import type { ClaveUsuario } from './entorno.js';
import { test, expect, esperarCarga } from './fixtures.js';

const VISTAS: { nombre: string; ruta: string; usuario: ClaveUsuario }[] = [
  { nombre: 'Perfil (alumno)', ruta: '/#/perfil', usuario: 'alumnaConProyecto' },
  { nombre: 'Buscar equipo', ruta: '/#/equipo', usuario: 'alumnoSinProyecto' },
  { nombre: 'Mi proyecto', ruta: '/#/proyecto', usuario: 'alumnaConProyecto' },
  { nombre: 'Buscar asesor', ruta: '/#/asesores', usuario: 'alumnaConProyecto' },
  { nombre: 'Panel de asesor', ruta: '/#/mentor', usuario: 'mentor' },
  { nombre: 'Panel admin', ruta: '/#/admin', usuario: 'admin' },
  { nombre: 'Completar perfil', ruta: '/#/completar-perfil', usuario: 'onboardingAuditoria' },
];

for (const tema of ['light', 'dark'] as const) {
  test.describe(`tema ${tema === 'light' ? 'claro' : 'oscuro'}`, () => {
    test('login', async ({ page, auditarAccesibilidad }) => {
      await page.emulateMedia({ colorScheme: tema });
      await page.goto('/#/login');
      await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
      await auditarAccesibilidad();
    });

    for (const vista of VISTAS) {
      test(vista.nombre, async ({ page, iniciarSesion, auditarAccesibilidad }) => {
        await iniciarSesion(vista.usuario, { tema });
        await page.goto(vista.ruta);
        await esperarCarga(page);
        await auditarAccesibilidad();
      });
    }
  });
}
