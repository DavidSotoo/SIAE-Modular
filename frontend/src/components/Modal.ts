// Modal component — reutilizable, generico.
// Uso: new Modal({ id, title, content, onConfirm })
export interface ModalOptions {
  id: string;
  title: string;
  contentHtml: string;
  confirmLabel?: string;
  confirmClass?: string;
  onConfirm: (modal: Modal) => void | Promise<void>;
}
export class Modal {
  private backdrop: HTMLElement;
  constructor(private opts: ModalOptions) {
    this.backdrop = this.build();
    document.body.appendChild(this.backdrop);
  }
  private build(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'modal-backdrop hidden';
    el.id = this.opts.id + '-backdrop';
    el.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="' + this.opts.id + '-title">' +
        '<div class="modal__header">' +
          '<h2 class="modal__title" id="' + this.opts.id + '-title">' + this.opts.title + '</h2>' +
          '<button class="btn btn--icon modal__close" aria-label="Cerrar"><span class="material-symbols-outlined">close</span></button>' +
        '</div>' +
        '<div class="modal__body">' + this.opts.contentHtml + '</div>' +
        '<div class="modal__footer">' +
          '<button class="btn btn--ghost" data-dismiss>Cancelar</button>' +
          '<button class="btn ' + (this.opts.confirmClass ?? 'btn--primary') + '" data-confirm>' +
            (this.opts.confirmLabel ?? 'Confirmar') +
          '</button>' +
        '</div>' +
      '</div>';
    el.querySelector('.modal__close')!.addEventListener('click', () => this.close());
    el.querySelector('[data-dismiss]')!.addEventListener('click', () => this.close());
    el.querySelector('[data-confirm]')!.addEventListener('click', () => this.handleConfirm());
    el.addEventListener('click', (e) => { if (e.target === el) this.close(); });
    return el;
  }
  open(): void { this.backdrop.classList.remove('hidden'); }
  close(): void { this.backdrop.classList.add('hidden'); }
  get bodyEl(): HTMLElement { return this.backdrop.querySelector('.modal__body') as HTMLElement; }
  get confirmBtn(): HTMLButtonElement { return this.backdrop.querySelector('[data-confirm]') as HTMLButtonElement; }
  setLoading(loading: boolean): void {
    this.confirmBtn.disabled = loading;
    if (loading) {
      this.confirmBtn.innerHTML = '<span class="spinner"></span> Enviando...';
    } else {
      this.confirmBtn.textContent = this.opts.confirmLabel ?? 'Confirmar';
    }
  }
  destroy(): void { this.backdrop.remove(); }
  private async handleConfirm(): Promise<void> {
    await this.opts.onConfirm(this);
  }
}