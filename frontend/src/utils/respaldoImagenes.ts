// Respaldo cuando una imagen no carga, sin manejadores `onerror` en linea (la
// CSP de index.html los bloquea). Un solo listener en fase de captura atiende a
// todas las imagenes, incluidas las que se insertan despues con innerHTML: el
// evento `error` de una imagen no burbujea, pero si pasa por la captura.
//
// Uso en el HTML:
// - data-respaldo="iniciales": reemplaza la imagen por el texto de data-initials.
// - data-respaldo="siguiente": oculta la imagen y muestra el elemento siguiente.
export function instalarRespaldoDeImagenes(): void {
  document.addEventListener(
    'error',
    (e) => {
      const img = e.target;
      if (!(img instanceof HTMLImageElement)) return;

      if (img.dataset.respaldo === 'iniciales') {
        if (img.parentElement) img.parentElement.textContent = img.dataset.initials ?? '';
      } else if (img.dataset.respaldo === 'siguiente') {
        img.classList.add('hidden');
        img.nextElementSibling?.classList.remove('hidden');
      }
    },
    true,
  );
}
