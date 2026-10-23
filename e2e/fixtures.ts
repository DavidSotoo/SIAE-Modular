// Fixtures compartidas: iniciar sesion como un usuario sembrado y auditar
// accesibilidad con axe.
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { test as base, expect, type Page } from '@playwright/test';
import { ARCHIVO_SESIONES, FOTO_ROTA, type ClaveUsuario } from './entorno.js';
import type { Sesion } from './global-setup.js';

function leerSesiones(): Record<ClaveUsuario, Sesion> {
  return JSON.parse(readFileSync(ARCHIVO_SESIONES, 'utf8'));
}

type Opciones = {
  /** Falla la prueba si hubo violaciones de la CSP. Se apaga solo donde se provocan. */
  vigilarCsp: boolean;
};

type Fixtures = {
  /** Deja la sesion del usuario en localStorage antes de que cargue la app. */
  iniciarSesion: (clave: ClaveUsuario, opciones?: { tema?: 'light' | 'dark' }) => Promise<void>;
  /** Corre axe con las reglas WCAG 2.1 A/AA y exige cero violaciones. */
  auditarAccesibilidad: () => Promise<void>;
};

export const test = base.extend<Fixtures & Opciones>({
  vigilarCsp: [true, { option: true }],

  page: async ({ page, vigilarCsp }, use) => {
    // El boton de Google carga un script externo; en pruebas se bloquea para
    // no depender de la red y la pagina muestra su alternativa.
    await page.route(/accounts\.google\.com/, (route) => route.abort());
    await page.route(FOTO_ROTA, (route) => route.fulfill({ status: 404 }));

    // Cualquier violacion de la CSP hace fallar la prueba en la que ocurre:
    // asi, si una vista nueva vuelve a usar un script u onerror en linea, el
    // CI lo detecta. Chrome las reporta como errores de consola.
    const violacionesCsp: string[] = [];
    page.on('console', (msg) => {
      const texto = msg.text();
      if (msg.type() !== 'error' || !/Content Security Policy/i.test(texto)) return;
      violacionesCsp.push(texto);
    });

    await use(page);

    if (vigilarCsp) expect(violacionesCsp, 'violaciones de la CSP').toEqual([]);
  },

  iniciarSesion: async ({ page }, use) => {
    await use(async (clave, opciones = {}) => {
      const sesion = leerSesiones()[clave];
      await page.addInitScript(
        ({ token, user, tema }) => {
          // Solo en la primera carga: si la app cambia la sesion (onboarding,
          // cerrar sesion), una recarga no debe restaurar la original.
          if (sessionStorage.getItem('e2e_sembrado')) return;
          sessionStorage.setItem('e2e_sembrado', '1');
          localStorage.setItem('siae_token', token);
          localStorage.setItem('siae_user', JSON.stringify(user));
          localStorage.setItem('siae_theme', tema);
        },
        { ...sesion, tema: opciones.tema ?? 'light' },
      );
    });
  },

  auditarAccesibilidad: async ({ page }, use) => {
    await use(async () => {
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
        .analyze();
      const resumen = violations.map(
        (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
      );
      expect(resumen, 'violaciones de accesibilidad').toEqual([]);
    });
  },
});

export { expect };

/** Espera a que la vista termine de cargar (sin esqueletos de carga visibles). */
export async function esperarCarga(page: Page): Promise<void> {
  await expect(page.locator('#main-content > *').first()).toBeVisible();
  await expect(page.locator('#main-content .skeleton')).toHaveCount(0);
}
