import {
  getMyProject,
  createProject,
  getProjectHistory,
  uploadProtocol,
  downloadProtocol,
} from '../services/project.service.js';
import { formatearFechaHora } from '../utils/fechas.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { estadoBadge, etiquetaDeEstado } from '../components/EstadoBadge.js';
import { skeletonPerfil, skeletonLineas } from '../components/Skeleton.js';
import { validarCampo, maximoPalabras, contarPalabras } from '../utils/validacion.js';
import { getAdvisorById } from '../services/advisor.service.js';
import { mensajeDeError } from '../services/errorMessages.js';
import { showToast } from '../components/Toast.js';
import type { Project, ProjectState } from '../types/index.js';
import { icono } from '../utils/iconos.js';

export class MiProyectoPage {
  private container: HTMLElement;
  private project: Project | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  async render() {
    this.container.innerHTML = skeletonPerfil();

    try {
      this.project = await getMyProject();
      this.buildView();
    } catch (err) {
      this.container.innerHTML =
        '<div class="state-empty">' +
        icono('error') +
        '<div class="state-empty__title">Error</div><div class="state-empty__msg">' +
        mensajeDeError(err) +
        '</div></div>';
    }
  }

  private buildView() {
    if (this.project === null) {
      this.container.innerHTML = `
        <div class="section-header">
          <h2>Mi proyecto</h2>
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
              <button type="submit" class="btn btn--primary" id="btn-create">Crear proyecto</button>
            </div>
          </form>
        </div>
      `;

      const form = document.getElementById('create-project-form') as HTMLFormElement;
      form.addEventListener('submit', (e) => this.handleCreate(e));

      const btnCrear = document.getElementById('btn-create') as HTMLButtonElement;
      const tituloInput = document.getElementById('titulo') as HTMLInputElement;
      const counter = document.getElementById('titulo-counter')!;
      const descripcionInput = document.getElementById('descripcion') as HTMLTextAreaElement;
      const descCounter = document.getElementById('descripcion-counter')!;

      // Los contadores ya existian, pero solo pintaban de rojo: se podia
      // enviar igual y el rechazo llegaba del backend. Ahora el boton se
      // bloquea mientras algo no cumpla.
      const actualizarContadores = () => {
        const palabrasTitulo = contarPalabras(tituloInput.value);
        counter.textContent = `${palabrasTitulo}/20 palabras`;
        counter.classList.toggle('text-error', palabrasTitulo > 20);

        const palabrasDesc = contarPalabras(descripcionInput.value);
        descCounter.textContent = `${palabrasDesc}/100 palabras`;
        descCounter.classList.toggle('text-error', palabrasDesc > 100);

        const vacio = !tituloInput.value.trim() || !descripcionInput.value.trim();
        btnCrear.disabled = vacio || palabrasTitulo > 20 || palabrasDesc > 100;
      };

      validarCampo({
        input: tituloInput,
        errorEl: document.getElementById('titulo-error')!,
        validar: maximoPalabras(20, 'El título'),
      });
      validarCampo({
        input: descripcionInput,
        errorEl: document.getElementById('descripcion-error')!,
        validar: maximoPalabras(100, 'La descripción'),
      });

      tituloInput.addEventListener('input', actualizarContadores);
      descripcionInput.addEventListener('input', actualizarContadores);
      actualizarContadores();
      return;
    }

    const orderedStates: ProjectState[] = ['borrador', 'pendiente', 'validado', 'registrado'];
    const currentActualState = this.project.estado_actual;

    // Determinar índice efectivo: 'correccion' se mapea a 'pendiente' para estado activo
    const effectiveStateIndex =
      currentActualState === 'correccion'
        ? orderedStates.indexOf('pendiente')
        : orderedStates.indexOf(currentActualState);

    let stepperHtml = '<div class="stepper">';
    orderedStates.forEach((state, index) => {
      let cssClass = '';
      let markerContent = '';

      if (currentActualState === 'cancelado') {
        cssClass = 'disabled';
        markerContent = '';
      } else if (index < effectiveStateIndex || currentActualState === 'registrado') {
        // 'registrado' es el estado final: no queda ningún paso en curso
        cssClass = 'completed';
        markerContent = icono('check');
      } else if (index === effectiveStateIndex) {
        if (currentActualState === 'correccion') {
          cssClass = 'alert';
          markerContent = icono('warning');
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
          ${icono('error')}
          <div>El proyecto requiere correcciones antes de continuar. Revisa el historial de cambios para más detalle.</div>
        </div>
      `;
    } else if (currentActualState === 'registrado') {
      const folioText = this.project.codigo_folio
        ? ` con el folio <strong>${this.project.codigo_folio}</strong>`
        : '';
      bannerHtml = `
        <div class="banner-alert banner-alert--success mt-4">
          ${icono('verified')}
          <div>Tu proyecto quedó registrado${folioText}. El protocolo ya no se puede modificar.</div>
        </div>
      `;
    } else if (currentActualState === 'cancelado') {
      bannerHtml = `
        <div class="banner-alert banner-alert--neutral mt-4">
          ${icono('info')}
          <div>Este proyecto fue cancelado. Ya no es posible editarlo ni continuar el flujo.</div>
        </div>
      `;
    }

    let membersHtml = '';
    this.project.miembros.forEach((m) => {
      membersHtml += `
        <div class="integrante">
          <div class="profile-card__avatar integrante__avatar">${escapeHtml(m.nombre.charAt(0))}</div>
          <div>
            <div class="integrante__nombre">${escapeHtml(m.nombre)}${m.es_lider ? ' <span class="badge badge--lider">Líder</span>' : ''}</div>
            <div class="integrante__codigo">${escapeHtml(m.codigo_cucei ?? '')}</div>
          </div>
        </div>
      `;
    });

    // El alumno no veia el estado de su propio proyecto como insignia: solo
    // lo deducia del stepper. Se muestra junto al folio.
    const folioBadge =
      `<div class="badges-row">` +
      estadoBadge(this.project.estado_actual) +
      (this.project.codigo_folio
        ? `<span class="badge badge--folio">${escapeHtml(this.project.codigo_folio)}</span>`
        : '') +
      `</div>`;

    this.container.innerHTML = `
      <div class="section-header section-header--con-accion">
        <div>
          <h2>Mi proyecto</h2>
          <p>Detalles de tu proyecto actual, asesor y estado del protocolo.</p>
        </div>
        ${folioBadge}
      </div>

      <div class="pila">
        
        <div class="card card--lg">
          <div class="proyecto-cabecera">
            <div>
              <h3 class="titulo-documento">${escapeHtml(this.project.titulo)}</h3>
              ${this.project.descripcion ? `<p class="text-muted mt-2 texto-multilinea texto-medida">${escapeHtml(this.project.descripcion)}</p>` : ''}
            </div>
          </div>

          ${stepperHtml}
          ${bannerHtml}

          ${currentActualState === 'cancelado' ? '' : this.renderDocumentSection()}
        </div>

        <div class="rejilla-dos">
          
          <div class="card card--md">
            <h3 class="text-title mb-4">Equipo</h3>
            <div>${membersHtml}</div>
          </div>

          <div class="card card--md">
            <h3 class="text-title mb-4">Asesor</h3>
            <div id="advisor-container">
              ${skeletonLineas(2)}
            </div>
          </div>
        </div>

        <div class="card card--md">
          <h3 class="text-title mb-4">Historial de cambios</h3>
          <div id="history-container">
            ${skeletonLineas(2)}
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
    const PROTOCOL_MSG: Partial<Record<ProjectState, string>> = {
      pendiente: 'Tu asesor está revisando el protocolo; no se puede reemplazar por ahora.',
      validado: 'Tu asesor validó el protocolo; falta que administración emita el folio.',
      registrado: 'El protocolo quedó registrado y ya no se puede reemplazar.',
    };
    const protocolMsg = hasDoc
      ? (PROTOCOL_MSG[state] ?? 'El protocolo no se puede reemplazar en este estado.')
      : 'Aún no se ha subido un protocolo.';

    const viewLink = hasDoc
      ? `<button class="btn btn--ghost btn--sm mt-2" id="btn-view-document">${icono('description')} Ver protocolo actual</button>`
      : '';

    const dropzone = canUpload
      ? `
      <div class="dropzone" id="protocol-dropzone">
        ${icono('upload_file')}
        <p class="text-label mt-2">Arrastra tu protocolo PDF aquí o</p>
        <button class="btn btn--secondary btn--sm mt-2" id="btn-select-file">${hasDoc ? 'Reemplazar archivo' : 'Seleccionar archivo'}</button>
        <input type="file" id="file-input" accept="application/pdf" class="hidden">
        <div id="file-error" class="form-error hidden mt-2"></div>
      </div>
    `
      : `
      <div class="state-empty state-empty--compacto">
        <div class="state-empty__msg">${protocolMsg}</div>
      </div>
    `;

    return `
      <hr class="divider">
      <div class="seccion-cabecera">
        <h3 class="text-title">Protocolo</h3>
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
      } catch (err) {
        showToast(mensajeDeError(err), { type: 'error' });
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
        .catch((err: unknown) => {
          showToast(mensajeDeError(err), { type: 'error' });
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
        <div class="state-empty state-empty--compacto">
          <div class="state-empty__msg">Aún no tienes asesor.</div>
          <a class="btn btn--ghost btn--sm mt-4" href="#/asesores">Buscar asesor</a>
        </div>
      `;
      return;
    }

    try {
      const advisor = await getAdvisorById(this.project!.id_mentor!);
      container.innerHTML = `
        <div class="profile-card__header">
          <div class="profile-card__avatar">${escapeHtml(advisor.nombre.charAt(0))}</div>
          <div>
            <div class="profile-card__name">${escapeHtml(advisor.nombre)}</div>
            <div class="profile-card__sub">${advisor.especialidad ? escapeHtml(advisor.especialidad) : 'Sin especialidad registrada'}</div>
          </div>
        </div>
      `;
    } catch {
      container.innerHTML = `
        <div class="state-empty state-empty--compacto">
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
      logs.forEach((log) => {
        const dateStr = formatearFechaHora(log.timestamp);
        const prev = etiquetaDeEstado(log.estado_anterior);
        const current = etiquetaDeEstado(log.estado_nuevo);
        const comment = log.comentario
          ? `<div class="text-label mt-1 text-muted">"${escapeHtml(log.comentario)}"</div>`
          : '';

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
        <div class="state-empty state-empty--compacto">
          <div class="state-empty__msg">Historial disponible próximamente.</div>
        </div>
      `;
    }
  }

  private async handleCreate(e: Event) {
    e.preventDefault();
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
    if (contarPalabras(titulo) > 20) {
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
    if (contarPalabras(descripcion) > 100) {
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
    } catch (err) {
      showToast(mensajeDeError(err), { type: 'error' });
      btn.disabled = false;
      btn.textContent = 'Crear proyecto';
    }
  }
}
