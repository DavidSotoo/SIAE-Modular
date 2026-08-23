import { getMyProject, createProject } from '../services/project.service.js';
import { getErrorMessage } from '../services/errorMessages.js';
import { showToast } from '../components/Toast.js';
import type { Project } from '../types/index.js';

const PROJECT_STATE_BADGE: Record<string, string> = {
  borrador: 'badge--borrador',
};

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
              <div id="titulo-error" class="form-error hidden"></div>
            </div>
            <div class="mt-4 flex justify-end">
              <button type="submit" class="btn btn--primary" id="btn-create">Crear Proyecto</button>
            </div>
          </form>
        </div>
      `;

      const form = document.getElementById('create-project-form') as HTMLFormElement;
      form.addEventListener('submit', (e) => this.handleCreate(e));
    } else {
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

      const badgeClass = PROJECT_STATE_BADGE[this.project.estado_actual] || 'badge--borrador';

      this.container.innerHTML = `
        <div class="section-header">
          <h2>Mi Proyecto</h2>
          <p>Detalles de tu proyecto actual y equipo de trabajo.</p>
        </div>
        <div class="card card--lg">
          <div style="display:flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem;">
            <div>
              <div class="text-label-sm" style="margin-bottom: 4px;">TÍTULO</div>
              <h3 style="font-size: 1.25rem; font-weight: 600;">${this.project.titulo}</h3>
            </div>
            <div class="badge ${badgeClass}" style="text-transform: uppercase;">${this.project.estado_actual}</div>
          </div>
          
          <div style="margin-bottom: 1.5rem;">
            <div class="text-label-sm" style="margin-bottom: 4px;">ID MENTOR</div>
            <div>${this.project.id_mentor ? this.project.id_mentor : '<span class="text-muted">Sin asignar</span>'}</div>
          </div>

          <hr class="divider">

          <h3 class="text-title mb-4">Integrantes (${this.project.miembros.length})</h3>
          <div>${membersHtml}</div>
        </div>
      `;
    }
  }

  private async handleCreate(e: Event) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = document.getElementById('titulo') as HTMLInputElement;
    const btn = document.getElementById('btn-create') as HTMLButtonElement;
    const errorDiv = document.getElementById('titulo-error')!;
    
    const titulo = input.value.trim();
    input.classList.remove('is-invalid');
    errorDiv.classList.add('hidden');

    if (titulo.length === 0) {
      input.classList.add('is-invalid');
      errorDiv.textContent = 'El título no puede estar vacío';
      errorDiv.classList.remove('hidden');
      return;
    }
    if (titulo.length > 200) {
      input.classList.add('is-invalid');
      errorDiv.textContent = 'El título no debe exceder 200 caracteres';
      errorDiv.classList.remove('hidden');
      return;
    }

    try {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Creando...';
      
      this.project = await createProject(titulo);
      showToast('Proyecto creado exitosamente', { type: 'success' });
      this.buildView();
    } catch (err: any) {
      showToast(getErrorMessage(err.code, err.status), { type: 'error' });
      btn.disabled = false;
      btn.textContent = 'Crear Proyecto';
    }
  }
}