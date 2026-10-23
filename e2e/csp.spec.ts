// Content Security Policy: que exista, que bloquee scripts inyectados y que
// los respaldos de imagen (antes onerror en linea) sigan funcionando.
import { test, expect, esperarCarga } from './fixtures.js';

type VentanaDePrueba = Window & { __xssAtributo?: number; __xssScript?: number };

test('la pagina declara una CSP sin scripts en linea', async ({ page }) => {
  await page.goto('/#/login');
  const csp = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute('content');
  expect(csp).toBeTruthy();

  const scriptSrc = csp!.split(';').find((d) => d.trim().startsWith('script-src'));
  expect(scriptSrc).toBeDefined();
  expect(scriptSrc).not.toContain("'unsafe-inline'");
  expect(scriptSrc).not.toContain("'unsafe-eval'");
  expect(csp).toContain("object-src 'none'");
});

test.describe('ataques bloqueados', () => {
  // Estas pruebas provocan violaciones a proposito.
  test.use({ vigilarCsp: false });

  test('un HTML inyectado no puede ejecutar scripts', async ({ page }) => {
    await page.goto('/#/login');

    const violaciones = page.evaluate(
      () =>
        new Promise<string[]>((resolve) => {
          const vistas: string[] = [];
          document.addEventListener('securitypolicyviolation', (e) => {
            vistas.push(e.violatedDirective);
            if (vistas.length === 2) resolve(vistas);
          });
        }),
    );

    await page.evaluate(() => {
      // Las dos formas clasicas de XSS al pintar con innerHTML: un manejador
      // en un atributo y un <script> insertado.
      document.body.insertAdjacentHTML(
        'beforeend',
        '<img src="/no-existe.png" onerror="window.__xssAtributo = 1">',
      );
      const s = document.createElement('script');
      s.textContent = 'window.__xssScript = 1';
      document.body.appendChild(s);
    });

    expect(await violaciones).toEqual([
      expect.stringMatching(/^script-src/),
      expect.stringMatching(/^script-src/),
    ]);
    const ejecutados = await page.evaluate(() => {
      const w = window as VentanaDePrueba;
      return [w.__xssAtributo, w.__xssScript];
    });
    expect(ejecutados).toEqual([undefined, undefined]);
  });
});

test('si la foto de perfil no carga, se muestran las iniciales', async ({
  page,
  iniciarSesion,
}) => {
  await iniciarSesion('alumnoSinProyecto');
  await page.goto('/#/perfil');
  await esperarCarga(page);

  // "E2E-Beto Alumno" -> "EA"
  await expect(page.locator('img[data-respaldo="iniciales"]')).toHaveCount(0);
  await expect(page.locator('#main-content').getByText('EA', { exact: true })).toBeVisible();
});

test('la pagina de error cae al icono si la mascota no carga', async ({ page, iniciarSesion }) => {
  await page.route('**/mascota-error.jpeg', (route) => route.fulfill({ status: 404 }));
  await iniciarSesion('alumnaConProyecto');
  await page.goto('/#/no-existe');

  await expect(page.locator('.error-state__img')).toBeHidden();
  await expect(page.locator('.error-state__icon')).toBeVisible();
});
