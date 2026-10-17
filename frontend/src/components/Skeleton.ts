// Siluetas de carga. Imitan la forma del contenido que viene, para que al
// llegar los datos no salte el layout. Antes solo Perfil las tenia; el resto
// mostraba un spinner con texto, que no reserva espacio.
//
// Son decorativas: van marcadas con aria-hidden y el contenedor anuncia la
// carga con aria-busy, para no leerle cajas vacias a un lector de pantalla.

/** Una barra. El ancho se pasa como porcentaje o medida CSS. */
function linea(ancho: string, alto = '14px', radio?: string): string {
  const r = radio ? `border-radius:${radio};` : '';
  return `<div class="skeleton sk-line" style="width:${ancho};height:${alto};${r}"></div>`;
}

function envolver(contenido: string): string {
  return `<div aria-busy="true" aria-live="polite" aria-label="Cargando contenido">
    <div aria-hidden="true">${contenido}</div>
  </div>`;
}

/** Cabecera de perfil: portada, avatar circular y datos. */
export function skeletonPerfil(): string {
  return envolver(`
    <div class="sk-hero">
      <div class="skeleton sk-cover"></div>
      <div class="sk-hero-body">
        <div class="skeleton sk-avatar"></div>
        <div class="sk-lines">
          ${linea('180px', '22px')}
          ${linea('120px')}
          ${linea('140px', '24px', '9999px')}
        </div>
      </div>
    </div>
    ${skeletonTarjeta(3)}
    ${skeletonTarjeta(2)}
  `);
}

/** Una tarjeta con un titulo y N lineas de texto. */
export function skeletonTarjeta(lineas = 2): string {
  const anchos = ['90%', '70%', '80%', '60%'];
  return `<div class="sk-card">
    ${linea('140px')}
    ${Array.from({ length: lineas }, (_, i) => linea(anchos[i % anchos.length])).join('')}
  </div>`;
}

/** Rejilla de tarjetas, como la de Buscar Equipo y Buscar Asesor. */
export function skeletonTarjetas(cantidad = 3): string {
  return envolver(
    `<div class="cards-grid">${Array.from({ length: cantidad }, () => skeletonTarjeta(2)).join('')}</div>`,
  );
}

/** Tabla con cabecera y filas, como los paneles de asesor y administracion. */
export function skeletonTabla(filas = 4, columnas = 4): string {
  const celda = (ancho: string) => `<td>${linea(ancho)}</td>`;
  const anchos = ['70px', '80%', '90px', '60%', '50%'];
  const cabecera = Array.from(
    { length: columnas },
    (_, i) => `<th>${linea(anchos[i % anchos.length], '10px')}</th>`,
  ).join('');
  const cuerpo = Array.from(
    { length: filas },
    () =>
      `<tr>${Array.from({ length: columnas }, (_, i) => celda(anchos[i % anchos.length])).join('')}</tr>`,
  ).join('');

  return envolver(`<div class="table-wrap">
    <table class="table">
      <thead><tr>${cabecera}</tr></thead>
      <tbody>${cuerpo}</tbody>
    </table>
  </div>`);
}

/** Bloque suelto de lineas, para secciones pequenas dentro de una vista. */
export function skeletonLineas(cantidad = 3): string {
  const anchos = ['80%', '60%', '70%', '50%'];
  return envolver(
    `<div class="sk-card">${Array.from({ length: cantidad }, (_, i) => linea(anchos[i % anchos.length])).join('')}</div>`,
  );
}
