// Modal component — reutilizable, generico.
// Uso: new Modal({ id, title, content, onConfirm })
//
// Gestion de foco para teclado y lectores de pantalla:
// - al abrir, el foco entra al modal y se recuerda que elemento lo tenia;
// - Tab y Shift+Tab circulan dentro del modal (no se escapan al fondo);
// - Escape lo cierra;
// - al cerrar, el foco vuelve al elemento que lo abrio.
export interface ModalOptions {
  id: string;
  title: string;
  contentHtml: string;
  confirmLabel?: string;
  confirmClass?: string;
  onConfirm: (modal: Modal) => void | Promise<void>;
}

// Selector de lo que puede recibir foco dentro del modal.
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export class Modal {
  private backdrop: HTMLElement;
  // Quien tenia el foco antes de abrir, para devolverselo al cerrar.
  private previamenteEnfocado: HTMLElement | null = null;
  private onKeydown: (e: KeyboardEvent) => void;

  constructor(private opts: ModalOptions) {
    this.backdrop = this.build();
    document.body.appendChild(this.backdrop);
    this.onKeydown = (e) => this.manejarTeclado(e);
  }

  private build(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'modal-backdrop hidden';
    el.id = this.opts.id + '-backdrop';
    el.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="' +
      this.opts.id +
      '-title">' +
      '<div class="modal__header">' +
      '<h2 class="modal__title" id="' +
      this.opts.id +
      '-title">' +
      this.opts.title +
      '</h2>' +
      '<button class="btn btn--icon modal__close" aria-label="Cerrar"><span class="material-symbols-outlined">close</span></button>' +
      '</div>' +
      '<div class="modal__body">' +
      this.opts.contentHtml +
      '</div>' +
      '<div class="modal__footer">' +
      '<button class="btn btn--ghost" data-dismiss>Cancelar</button>' +
      '<button class="btn ' +
      (this.opts.confirmClass ?? 'btn--primary') +
      '" data-confirm>' +
      (this.opts.confirmLabel ?? 'Confirmar') +
      '</button>' +
      '</div>' +
      '</div>';
    el.querySelector('.modal__close')!.addEventListener('click', () => this.close());
    el.querySelector('[data-dismiss]')!.addEventListener('click', () => this.close());
    el.querySelector('[data-confirm]')!.addEventListener('click', () => this.handleConfirm());
    el.addEventListener('click', (e) => {
      if (e.target === el) this.close();
    });
    return el;
  }

  open(): void {
    // Se recuerda el disparador para devolverle el foco al cerrar.
    this.previamenteEnfocado = document.activeElement as HTMLElement | null;
    this.backdrop.classList.remove('hidden');
    document.addEventListener('keydown', this.onKeydown, true);
    // El foco entra al modal: al primer campo util, o al boton de cerrar.
    // Ojo: FOCUSABLE es una lista separada por comas, asi que no se le puede
    // anteponer '.modal__body ' (solo afectaria al primer selector).
    const primero =
      this.bodyEl.querySelector<HTMLElement>(FOCUSABLE) ??
      this.backdrop.querySelector<HTMLElement>('.modal__close');
    primero?.focus();
  }

  close(): void {
    this.backdrop.classList.add('hidden');
    document.removeEventListener('keydown', this.onKeydown, true);
    // Devuelve el foco a quien abrio el modal, si sigue en la pagina.
    if (this.previamenteEnfocado && document.contains(this.previamenteEnfocado)) {
      this.previamenteEnfocado.focus();
    }
  }

  private manejarTeclado(e: KeyboardEvent): void {
    if (this.backdrop.classList.contains('hidden')) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
      return;
    }

    if (e.key !== 'Tab') return;

    // Trampa de foco: Tab desde el ultimo vuelve al primero y viceversa, para
    // que el foco no se escape al contenido de fondo que deberia estar inerte.
    const enfocables = Array.from(this.backdrop.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (n) => n.offsetParent !== null,
    );
    if (enfocables.length === 0) return;

    const primero = enfocables[0];
    const ultimo = enfocables[enfocables.length - 1];
    const activo = document.activeElement;

    if (e.shiftKey && activo === primero) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && activo === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  }

  get bodyEl(): HTMLElement {
    return this.backdrop.querySelector('.modal__body') as HTMLElement;
  }
  get confirmBtn(): HTMLButtonElement {
    return this.backdrop.querySelector('[data-confirm]') as HTMLButtonElement;
  }
  setLoading(loading: boolean): void {
    this.confirmBtn.disabled = loading;
    if (loading) {
      this.confirmBtn.innerHTML = '<span class="spinner"></span> Enviando...';
    } else {
      this.confirmBtn.textContent = this.opts.confirmLabel ?? 'Confirmar';
    }
  }
  destroy(): void {
    document.removeEventListener('keydown', this.onKeydown, true);
    this.backdrop.remove();
  }
  private async handleConfirm(): Promise<void> {
    await this.opts.onConfirm(this);
  }
}
