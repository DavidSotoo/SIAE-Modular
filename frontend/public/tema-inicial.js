// Aplica el tema guardado (o el del sistema) antes del primer pintado, para
// evitar el parpadeo de tema equivocado. Se carga como script clasico y
// bloqueante desde index.html; main.ts lo vuelve a aplicar al arrancar.
(function () {
  var t = localStorage.getItem('siae_theme');
  if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
})();
