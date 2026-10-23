// Las fechas se muestran en espanol de Mexico aunque el navegador este en
// otro idioma y otra zona horaria.
import { TITULO_PROYECTO } from './entorno.js';
import { test, expect, esperarCarga } from './fixtures.js';

test.use({ locale: 'en-US', timezoneId: 'Asia/Tokyo' });

const FECHA_ES_MX = /\b\d{1,2} (ene|feb|mar|abr|may|jun|jul|ago|sept?|oct|nov|dic)\.? \d{4}\b/;
const FECHA_CON_DIAGONALES = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/;

test('con el navegador en ingles, el panel admin muestra fechas en es-MX', async ({
  page,
  iniciarSesion,
}) => {
  await iniciarSesion('admin');
  await page.goto('/#/admin');
  await esperarCarga(page);

  const fila = page.locator('tr', { hasText: TITULO_PROYECTO });
  await expect(fila).toContainText(FECHA_ES_MX);
  await expect(fila).not.toContainText(FECHA_CON_DIAGONALES);
});
