// Navegacion y control de acceso por rol en el router del frontend.
import { CODIGO_ONBOARDING } from './entorno.js';
import { test, expect, esperarCarga } from './fixtures.js';

test('sin sesion, cualquier ruta lleva al login', async ({ page }) => {
  await page.goto('/#/proyecto');
  await expect(page).toHaveURL(/#\/login$/);
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
});

// Sin hash, el router pinta la pagina del rol sin reescribir la URL.
test('el mentor aterriza en su panel', async ({ page, iniciarSesion }) => {
  await iniciarSesion('mentor');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Panel de Asesor' })).toBeVisible();
});

test('el admin aterriza en su panel', async ({ page, iniciarSesion }) => {
  await iniciarSesion('admin');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Panel Administrativo' })).toBeVisible();
});

test('un alumno no puede abrir el panel de admin', async ({ page, iniciarSesion }) => {
  await iniciarSesion('alumnaConProyecto');
  await page.goto('/#/admin');
  await expect(page).toHaveURL(/#\/perfil$/);
});

test('con sesion, el login redirige a la pagina del rol', async ({ page, iniciarSesion }) => {
  await iniciarSesion('alumnaConProyecto');
  await page.goto('/#/login');
  await expect(page).toHaveURL(/#\/perfil$/);
});

test('una ruta desconocida muestra el estado de no encontrado', async ({ page, iniciarSesion }) => {
  await iniciarSesion('alumnaConProyecto');
  await page.goto('/#/no-existe');
  await expect(page.locator('#main-content')).toContainText(/no encontrad/i);
});

test('el menu lateral solo ofrece las rutas del rol', async ({ page, iniciarSesion }) => {
  await iniciarSesion('mentor');
  await page.goto('/#/mentor');
  const menu = page.getByRole('navigation', { name: 'Menú lateral' });
  await expect(menu.locator('a[href="#/mentor"]')).toBeVisible();
  await expect(menu.locator('a[href="#/admin"]')).toHaveCount(0);
  await expect(menu.locator('a[href="#/proyecto"]')).toHaveCount(0);
});

test.describe('onboarding', () => {
  test('el alumno sin codigo CUCEI no sale de completar perfil hasta capturarlo', async ({
    page,
    iniciarSesion,
  }) => {
    await iniciarSesion('onboardingFlujo');
    await page.goto('/#/proyecto');
    await expect(page).toHaveURL(/#\/completar-perfil$/);

    const campo = page.getByLabel('Código CUCEI');
    const continuar = page.getByRole('button', { name: 'Continuar' });

    // Un codigo incompleto no habilita el boton.
    await campo.fill('12345');
    await expect(continuar).toBeDisabled();

    await campo.fill(CODIGO_ONBOARDING);
    await expect(continuar).toBeEnabled();
    await continuar.click();

    await expect(page).toHaveURL(/#\/perfil$/);
    await expect(page.locator('#toast-container')).toContainText('Perfil completado');

    // Ya con codigo, puede navegar a las rutas de alumno.
    await page.goto('/#/equipo');
    await expect(page).toHaveURL(/#\/equipo$/);
  });
});

test('cerrar sesion borra la sesion y vuelve al login', async ({ page, iniciarSesion }) => {
  await iniciarSesion('alumnoSinProyecto');
  await page.goto('/#/perfil');
  await esperarCarga(page);
  await page.getByRole('link', { name: /cerrar sesión/i }).click();
  await expect(page).toHaveURL(/#\/login$/);
  expect(await page.evaluate(() => localStorage.getItem('siae_token'))).toBeNull();
});
