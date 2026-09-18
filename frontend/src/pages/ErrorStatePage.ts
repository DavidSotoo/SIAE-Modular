// ─── Página de estado de error (404 / servidor caído) ─────────────────────
// Reutilizable: se llama con el contenedor y el tipo de error para renderizar
// la mascota SIAE + un mensaje adecuado. Si la imagen no existe todavía en
// frontend/public/mascota-error.jpeg, cae automáticamente a un ícono.

export type ErrorStateKind = 'not-found' | 'offline';

interface ErrorStateOptions {
  onRetry?: () => void;
}

const CONTENT: Record<ErrorStateKind, { title: string; msg: string; icon: string }> = {
  'not-found': {
    title: 'Página no encontrada',
    msg: 'La ruta que buscas no existe o fue movida.',
    icon: 'explore_off',
  },
  offline: {
    title: 'No pudimos conectar con el servidor',
    msg: 'El servicio podría estar caído o tu conexión falló. Intenta de nuevo en unos segundos.',
    icon: 'cloud_off',
  },
};

export function renderErrorState(container: HTMLElement, kind: ErrorStateKind, options: ErrorStateOptions = {}): void {
  const { title, msg, icon } = CONTENT[kind];

  container.innerHTML = `
    <div class="error-state">
      <img src="/mascota-error.jpeg" alt="" class="error-state__img" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';" />
      <span class="material-symbols-outlined error-state__icon" style="display:none;">${icon}</span>
      <div class="state-empty__title">${title}</div>
      <div class="state-empty__msg">${msg}</div>
      ${options.onRetry ? '<button type="button" class="btn btn--primary" id="error-state-retry">Reintentar</button>' : ''}
    </div>
  `;

  if (options.onRetry) {
    container.querySelector('#error-state-retry')?.addEventListener('click', options.onRetry);
  }
}
