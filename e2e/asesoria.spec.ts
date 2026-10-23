// Flujo entre dos roles: la alumna solicita asesoria desde el modal y el
// mentor la acepta en su panel. De paso fija el comportamiento del modal con
// teclado (foco, trampa de Tab, Escape y foco devuelto).
import { TITULO_PROYECTO, USUARIOS } from './entorno.js';
import { test, expect, esperarCarga } from './fixtures.js';

test.describe.configure({ mode: 'serial' });

const MENSAJE = 'Nos interesa su experiencia en sistemas embebidos.';

function tarjetaDelMentor(page: import('@playwright/test').Page) {
  return page.locator('.profile-card', { hasText: USUARIOS.mentor.nombre });
}

test('el modal de solicitud se maneja por completo con teclado', async ({
  page,
  iniciarSesion,
}) => {
  await iniciarSesion('alumnaConProyecto');
  await page.goto('/#/asesores');
  await esperarCarga(page);

  const solicitar = tarjetaDelMentor(page).getByRole('button', { name: 'Solicitar asesoría' });
  await solicitar.focus();
  await page.keyboard.press('Enter');

  const modal = page.getByRole('dialog', {
    name: `Solicitar asesoría a ${USUARIOS.mentor.nombre}`,
  });
  await expect(modal).toBeVisible();

  // Al abrir, el foco entra al primer campo del modal.
  await expect(modal.getByLabel('Mensaje (opcional)')).toBeFocused();

  // Tab y Shift+Tab no se escapan del modal.
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    expect(await modal.evaluate((m) => m.contains(document.activeElement))).toBe(true);
  }
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Shift+Tab');
    expect(await modal.evaluate((m) => m.contains(document.activeElement))).toBe(true);
  }

  // Escape cierra y el foco vuelve al boton que lo abrio.
  await page.keyboard.press('Escape');
  await expect(modal).toBeHidden();
  await expect(solicitar).toBeFocused();
});

test('la alumna envia la solicitud de asesoria', async ({ page, iniciarSesion }) => {
  await iniciarSesion('alumnaConProyecto');
  await page.goto('/#/asesores');
  await esperarCarga(page);

  await tarjetaDelMentor(page).getByRole('button', { name: 'Solicitar asesoría' }).click();
  const modal = page.getByRole('dialog');
  await modal.getByLabel('Mensaje (opcional)').fill(MENSAJE);
  await modal.getByRole('button', { name: 'Enviar solicitud' }).click();

  await expect(page.locator('#toast-container')).toContainText('Solicitud enviada exitosamente');
  await expect(modal).toBeHidden();
});

test('el mentor ve la solicitud y la acepta', async ({ page, iniciarSesion }) => {
  await iniciarSesion('mentor');
  await page.goto('/#/mentor');
  await esperarCarga(page);

  const solicitud = page.locator('.request-card', { hasText: TITULO_PROYECTO });
  await expect(solicitud).toContainText(MENSAJE);
  await solicitud.getByRole('button', { name: 'Aceptar' }).click();

  await expect(page.locator('#toast-container')).toContainText('Solicitud aceptada');
  await expect(solicitud).toHaveCount(0);
  await expect(page.locator('#projects-container')).toContainText(TITULO_PROYECTO);
});

test('con asesor asignado, la alumna ya no puede pedir otro', async ({ page, iniciarSesion }) => {
  await iniciarSesion('alumnaConProyecto');
  await page.goto('/#/asesores');
  await esperarCarga(page);
  await expect(
    tarjetaDelMentor(page).getByRole('button', { name: 'Ya tienes asesor' }),
  ).toBeDisabled();
});
