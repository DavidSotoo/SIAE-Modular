import { getMyProject, createProject, getProjectHistory, uploadProtocol, downloadProtocol } from '../services/project.service.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { getAdvisorById } from '../services/advisor.service.js';
import { getErrorMessage } from '../services/errorMessages.js';
import { showToast } from '../components/Toast.js';
import type { Project, ProjectState } from '../types/index.js';

export class MiProyectoPage {
  private container: HTMLElement;
  private project: Project | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  async render() {
    this.container.innerHTML = '<div class="state-loading"><span class="spinner"></span> Cargando proyecto...</div>';

    try {
      this.project = await getMyProject();
      this.buildView();
    } catch (err: any) {
      this.container.innerHTML = '<div class="state-empty"><span class="material-symbols-outlined">error</span><div class="state-empty__title">Error</div><div class="state-empty__msg">' + getErrorMessage(err.code, err.status) + '</div></div>';
    }
  }

  private buildView() {
    if (this.project === null) {
      this.container.innerHTML = `
        <div class="section-header">
          <h2>Mi Proyecto</h2>
          <p>No tienes un proyecto activo. Crea uno para poder buscar equipo y asesor.</p>
        </div>
        <div class="card card--md">
          <form id="create-project-form">
            <div class="form-group">
              <label class="form-label" for="titulo">Título provisional del proyecto</label>
              <input type="text" id="titulo" name="titulo" class="form-control" placeholder="Ej. Sistema Integral de Administración..." required>
              <div id="titulo-counter" class="text-label-sm text-muted mt-1">0/20 palabras</div>
              <div id="titulo-error" class="form-error hidden"></div>
            </div>
            <div class="form-group mt-4">
              <label class="form-label" for="descripcion">Descripción breve</label>
              <textarea id="descripcion" name="descripcion" class="form-control" rows="4" placeholder="¿Qué problema resuelve el proyecto y cómo? Tu asesor la verá al revisar tu solicitud." required></textarea>
              <div id="descripcion-counter" class="text-label-sm text-muted mt-1">0/100 palabras</div>
              <div id="descripcion-error" class="form-error hidden"></div>
            </div>
            <div class="mt-4 flex justify-end">
              <button type="submit" class="btn btn--primary" id="btn-create">Crear Proyecto</button>
            </div>
          </form>
        </div>
      `;

      const form = document.getElementById('create-project-form') as HTMLFormElement;
      form.addEventListener('submit', (e) => this.handleCreate(e));

      const tituloInput = document.getElementById('titulo') as HTMLInputElement;
      const counter = document.getElementById('titulo-counter')!;
      tituloInput.addEventListener('input', () => {
        const count = this.countWords(tituloInput.value);
        counter.textContent = `${count}/20 palabras`;
        counter.classList.toggle('text-error', count > 20);
      });

      const descripcionInput = document.getElementById('descripcion') as HTMLTextAreaElement;
      const descCounter = document.getElementById('descripcion-counter')!;
      descripcionInput.addEventListener('input', () => {
        const count = this.countWords(descripcionInput.value);
        descCounter.textContent = `${count}/100 palabras`;
        descCounter.classList.toggle('text-error', count > 100);
      });
      return;
    }

    const orderedStates: ProjectState[] = ['borrador', 'pendiente', 'validado', 'registrado'];
    const currentActualState = this.project.estado_actual;
    
    // Determinar índice efectivo: 'correccion' se mapea a 'pendiente' para estado activo
    const effectiveStateIndex = currentActualState === 'correccion' 
      ? orderedStates.indexOf('pendiente') 
      : orderedStates.indexOf(currentActualState);

    let stepperHtml = '<div class="stepper">';
    orderedStates.forEach((state, index) => {
      let cssClass = '';
      let markerContent = '';
      
      if (currentActualState === 'cancelado') {
        cssClass = 'disabled';
        markerContent = '';
      } else if (index < effectiveStateIndex) {
        cssClass = 'completed';
        markerContent = '<span class="material-symbols-outlined">check</span>';
      } else if (index === effectiveStateIndex) {
        if (currentActualState === 'correccion') {
          cssClass = 'alert';
          markerContent = '<span class="material-symbols-outlined">warning</span>';
        } else {
          cssClass = 'active';
          markerContent = '';
        }
      }
      
      const labelStr = state.charAt(0).toUpperCase() + state.slice(1);
      stepperHtml += `
        <div class="stepper-item ${cssClass}">
          <div class="stepper-marker">${markerContent}</div>
          <div class="stepper-label">${labelStr}</div>
        </div>
      `;
    });
    stepperHtml += '</div>';

    let bannerHtml = '';
    if (currentActualState === 'correccion') {
      bannerHtml = `
        <div class="banner-alert mt-4">
          <span class="material-symbols-outlined">error</span>
          <div>El proyecto requiere correcciones antes de continuar. Revisa el historial de cambios para más detalle.</div>
        </div>
      `;
    } else if (currentActualState === 'cancelado') {
      bannerHtml = `
        <div class="banner-alert banner-alert--neutral mt-4">
          <span class="material-symbols-outlined">info</span>
          <div>Este proyecto fue cancelado. Ya no es posible editarlo ni continuar el flujo.</div>
        </div>
      `;
    }

    let membersHtml = '';
    this.project.miembros.forEach(m => {
      membersHtml += `
        <div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--color-outline-variant);">
          <div class="profile-card__avatar" style="width: 32px; height: 32px; font-size: 14px; margin-right: 12px;">${m.nombre.charAt(0)}</div>
          <div>
            <div style="font-weight: 500;">${m.nombre}</div>
            <div style="font-size: 0.85rem; color: var(--color-on-surface-variant);">${m.codigo_cucei}</div>
          </div>
        </div>
      `;
    });

    const folioBadge = this.project.codigo_folio 
      ? `<div class="badge badge--folio">Folio: ${this.project.codigo_folio}</div>` 
      : '';

    this.container.innerHTML = `
      <div class="section-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h2>Mi Proyecto</h2>
          <p>Detalles de tu proyecto actual, asesor y estado del protocolo.</p>
        </div>
        ${folioBadge}
      </div>

      <div class="cards-grid" style="grid-template-columns: 1fr; gap: var(--sp-6);">
        
        <div class="card card--lg">
          <div style="display:flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem;">
            <div>
              <div class="text-label-sm">TÍTULO</div>
              <h3 class="text-title">${escapeHtml(this.project.titulo)}</h3>
              ${this.project.descripcion ? `<p class="text-muted mt-2" style="white-space: pre-line; max-width: 70ch;">${escapeHtml(this.project.descripcion)}</p>` : ''}
            </div>
          </div>

          ${stepperHtml}
          ${bannerHtml}

          ${currentActualState === 'cancelado' ? '' : this.renderDocumentSection()}
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--sp-6);">
          
          <div class="card card--md">
            <h3 class="text-title mb-4">Equipo de Trabajo</h3>
            <div>${membersHtml}</div>
          </div>

          <div class="card card--md">
            <h3 class="text-title mb-4">Asesor / Mentor</h3>
            <div id="advisor-container">
              <div class="state-loading"><span class="spinner"></span></div>
            </div>
          </div>
        </div>

        <div class="card card--md">
          <h3 class="text-title mb-4">Historial de Cambios</h3>
          <div id="history-container">
            <div class="state-loading"><span class="spinner"></span></div>
          </div>
        </div>

      </div>
    `;

    this.setupDropzone();
    this.setupViewDocument();
    this.loadAdvisor();
    this.loadHistory();
  }

  private renderDocumentSection(): string {
    const state = this.project!.estado_actual;
    const canUpload = state === 'borrador' || state === 'correccion';
    const hasDoc = !!this.project!.pdf_path;

    const viewLink = hasDoc
      ? `<button class="btn btn--ghost btn--sm mt-2" id="btn-view-document"><span class="material-symbols-outlined">description</span> Ver protocolo actual</button>`
      : '';

    const dropzone = canUpload ? `
      <div class="dropzone" id="protocol-dropzone">
        <span class="material-symbols-outlined">upload_file</span>
        <p class="text-label mt-2">Arrastra tu protocolo PDF aquí o</p>
        <button class="btn btn--secondary btn--sm mt-2" id="btn-select-file">${hasDoc ? 'Reemplazar Archivo' : 'Seleccionar Archivo'}</button>
        <input type="file" id="file-input" accept="application/pdf" class="hidden">
        <div id="file-error" class="form-error hidden mt-2"></div>
      </div>
    ` : `
      <div class="state-empty" style="padding: 16px 0;">
        <div class="state-empty__msg">${hasDoc ? 'El protocolo está en revisión, no se puede reemplazar por ahora.' : 'Aún no se ha subido un protocolo.'}</div>
      </div>
    `;

    return `
      <hr class="divider">
      <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h3 class="text-title" style="margin: 0;">Documentación Principal</h3>
        ${viewLink}
      </div>
      ${dropzone}
    `;
  }

  private setupViewDocument() {
    const btn = document.getElementById('btn-view-document');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      try {
        const blob = await downloadProtocol(this.project!.id_proyecto);
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } catch (err: any) {
        showToast(getErrorMessage(err.code, err.status), { type: 'error' });
      }
    });
  }

  private setupDropzone() {
    const dropzone = document.getElementById('protocol-dropzone');
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    const btnSelect = document.getElementById('btn-select-file');
    const errorDiv = document.getElementById('file-error');
    if (!dropzone || !fileInput || !btnSelect || !errorDiv) return;

    const handleFile = (file: File) => {
      errorDiv.classList.add('hidden');
      if (file.type !== 'application/pdf') {
        errorDiv.textContent = 'El archivo debe ser un PDF.';
        errorDiv.classList.remove('hidden');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        errorDiv.textContent = 'El archivo no debe exceder 10MB.';
        errorDiv.classList.remove('hidden');
        return;
      }

      uploadProtocol(this.project!.id_proyecto, file)
        .then(async () => {
          showToast('Protocolo subido exitosamente.', { type: 'success' });
          this.project = await getMyProject();
          this.buildView();
        })
        .catch((err: any) => {
          showToast(getErrorMessage(err.code, err.status), { type: 'error' });
        });
    };

    btnSelect.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length > 0) {
        handleFile(fileInput.files[0]);
      }
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dropzone--dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dropzone--dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dropzone--dragover');
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
      }
    });
  }

  private async loadAdvisor() {
    const container = document.getElementById('advisor-container');
    if (!container) return;

    if (!this.project!.id_mentor) {
      container.innerHTML = `
        <div class="state-empty" style="padding: 24px 0;">
          <div class="state-empty__msg">Sin asesor asignado aún.</div>
          <button class="btn btn--ghost btn--sm mt-4" disabled>Buscar Asesor</button>
        </div>
      `;
      return;
    }

    try {
      const advisor = await getAdvisorById(this.project!.id_mentor!);
      container.innerHTML = `
        <div class="profile-card__header">
          <div class="profile-card__avatar">${advisor.nombre.charAt(0)}</div>
          <div>
            <div class="profile-card__name">${advisor.nombre}</div>
            <div class="profile-card__sub">${advisor.especialidad || 'Sin especialidad registrada'}</div>
          </div>
        </div>
      `;
    } catch {
      container.innerHTML = `
        <div class="state-empty" style="padding: 24px 0;">
          <div class="state-empty__msg">Información del asesor próximamente.</div>
        </div>
      `;
    }
  }

  private async loadHistory() {
    const container = document.getElementById('history-container');
    if (!container) return;

    try {
      const logs = await getProjectHistory(this.project!.id_proyecto);
      if (logs.length === 0) {
        container.innerHTML = '<div class="text-muted">No hay historial registrado.</div>';
        return;
      }

      let timelineHtml = '<div class="timeline">';
      logs.forEach(log => {
        const dateStr = new Date(log.timestamp).toLocaleString();
        const prev = log.estado_anterior ? log.estado_anterior : 'N/A';
        const current = log.estado_nuevo;
        const comment = log.comentario ? `<div class="text-label mt-1 text-muted">"${log.comentario}"</div>` : '';

        timelineHtml += `
          <div class="timeline-item">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <div class="text-label-sm text-muted">${dateStr}</div>
              <div>Cambio de <strong>${prev}</strong> a <strong>${current}</strong></div>
              ${comment}
            </div>
          </div>
        `;
      });
      timelineHtml += '</div>';
      container.innerHTML = timelineHtml;
    } catch {
      container.innerHTML = `
        <div class="state-empty" style="padding: 24px 0;">
          <div class="state-empty__msg">Historial disponible próximamente.</div>
        </div>
      `;
    }
  }

  private countWords(text: string): number {
    const trimmed = text.trim();
    return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
  }

  private async handleCreate(e: Event) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = document.getElementById('titulo') as HTMLInputElement;
    const btn = document.getElementById('btn-create') as HTMLButtonElement;
    const errorDiv = document.getElementById('titulo-error')!;
    
    const descInput = document.getElementById('descripcion') as HTMLTextAreaElement;
    const descErrorDiv = document.getElementById('descripcion-error')!;

    const titulo = input.value.trim();
    const descripcion = descInput.value.trim();
    input.classList.remove('is-invalid');
    errorDiv.classList.add('hidden');
    descInput.classList.remove('is-invalid');
    descErrorDiv.classList.add('hidden');

    if (titulo.length === 0) {
      input.classList.add('is-invalid');
      errorDiv.textContent = 'El título no puede estar vacío';
      errorDiv.classList.remove('hidden');
      return;
    }
    if (this.countWords(titulo) > 20) {
      input.classList.add('is-invalid');
      errorDiv.textContent = 'El título no debe exceder 20 palabras';
      errorDiv.classList.remove('hidden');
      return;
    }
    if (descripcion.length === 0) {
      descInput.classList.add('is-invalid');
      descErrorDiv.textContent = 'Escribe una breve descripción del proyecto';
      descErrorDiv.classList.remove('hidden');
      return;
    }
    if (this.countWords(descripcion) > 100) {
      descInput.classList.add('is-invalid');
      descErrorDiv.textContent = 'La descripción no debe exceder 100 palabras';
      descErrorDiv.classList.remove('hidden');
      return;
    }

    try {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Creando...';
      
      this.project = await createProject(titulo, descripcion);
      showToast('Proyecto creado exitosamente', { type: 'success' });
      this.buildView();
    } catch (err: any) {
      showToast(getErrorMessage(err.code, err.status), { type: 'error' });
      btn.disabled = false;
      btn.textContent = 'Crear Proyecto';
    }
  }
}