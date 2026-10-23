// Formato de fechas para toda la app. La interfaz esta en espanol de Mexico,
// asi que el formato no debe depender del idioma del navegador: con
// `toLocaleDateString()` sin argumentos, un navegador en ingles mostraba
// "10/22/2026" (mes primero) en una app en espanol.
//
// La zona horaria se fija en la de Guadalajara (CUCEI): una fecha limite o un
// cambio de estado se lee igual sin importar desde donde se consulte.
const LOCALE = 'es-MX';
const ZONA = 'America/Mexico_City';

const soloFecha = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: ZONA,
});

const fechaYHora = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: ZONA,
});

/** "22 oct 2026" */
export function formatearFecha(valor: string | Date): string {
  return soloFecha.format(new Date(valor));
}

/** "22 oct 2026, 9:41 p.m." */
export function formatearFechaHora(valor: string | Date): string {
  return fechaYHora.format(new Date(valor));
}
