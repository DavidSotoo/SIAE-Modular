import { getAreas } from '../services/student.service.js';
import { searchAdvisors, createAdvisorRequest } from '../services/advisor.service.js';
import { getMyProject } from '../services/project.service.js';
import { getErrorMessage } from '../services/errorMessages.js';
import { showToast } from '../components/Toast.js';
import { Modal } from '../components/Modal.js';
import type { Area, Project, AdvisorSearchResult } from '../types/index.js';

export class BuscarAsesorPage {
  private container: HTMLElement;
  private myProject: Project | null = null;
  private areas: Area[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
  }

  async render() {
    this.container.innerHTML = '<div class="state-loading"><span class="spinner"></span> Cargando página...</div>';
    try {
      const [project, areas] = await Promise.all([
        getMyProject(),
        getAreas()
      ]);
      this.myProject = project;
      this.areas = areas;
      this.buildLayout();
    } catch (err: any) {
      this.container.innerHTML = '<div class="state-empty"><span class="material-symbols-outlined">error</span><div class="state-empty__title">Error</div><div class="state-empty__msg">' + getErrorMessage(err.code, err.status) + '</div></div>';
    }
  }

  private buildLayout() {
    this.container.innerHTML = `
      <div class="section-header">
        <h2>Buscar Asesor</h2>
        <p>Explora asesores disponibles y solicita su tutoría para tu proyecto.</p>
      </div>
      <form id="search-form" class="filters-bar">
        <div class="form-group">
          <label class="form-label text-label-sm" for="filter-area">Área</label>
          <select id="filter-area" name="area" class="form-control">
            <option value="">Cualquiera</option>
            ${this.areas.map(a => `<option value="${a.id_area}">${a.nombre}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="flex: 0 0 auto;">
          <button type="submit" class="btn btn--primary"><span class="material-symbols-outlined">search</span> Buscar</button>
        </div>
      </form>
      
      <div id="search-results-container"></div>
    `;

    const searchForm = document.getElementById('search-form') as HTMLFormElement;
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.performSearch(new FormData(searchForm));
    });

    this.performSearch(new FormData(searchForm));
  }

  private async performSearch(fd: FormData) {
    const resultsContainer = document.getElementById('search-results-container')!;
    resultsContainer.innerHTML = '<div class="state-loading"><span class="spinner"></span> Buscando...</div>';

    const params: any = {};
    if (fd.get('area')) params.area = Number(fd.get('area'));

    try {
      const advisors = await searchAdvisors(params);
      
      if (advisors.length === 0) {
        resultsContainer.innerHTML = '<div class="state-empty"><span class="material-symbols-outlined">person_search</span><div class="state-empty__title">Sin resultados</div><div class="state-empty__msg">No se encontraron asesores con esos filtros.</div></div>';
        return;
      }

      let html = '<div class="cards-grid">';
      advisors.forEach(advisor => {
        const areaChips = advisor.areas.map(a => `<span class="chip chip--area">${a.nombre}</span>`).join(' ');
        
        let buttonHtml = '';
        if (this.myProject) {
          if (this.myProject.id_mentor !== null) {
            buttonHtml = '<button class="btn btn--secondary btn--full" disabled title="Ya tienes un asesor asignado">Ya tienes asesor</button>';
          } else {
            buttonHtml = `<button class="btn btn--primary btn--full btn-solicitar" data-id="${advisor.id_usuario}" data-nombre="${advisor.nombre}">Solicitar Asesoría</button>`;
          }
        }

        html += `
          <div class="profile-card">
            <div class="profile-card__header">
              <div class="profile-card__avatar">${advisor.nombre.charAt(0)}</div>
              <div>
                <div class="profile-card__name">${advisor.nombre}</div>
                <div class="profile-card__sub">${advisor.especialidad || 'Sin especialidad registrada'}</div>
              </div>
            </div>
            <div class="profile-card__bio">Cupo: ${advisor.proyectos_activos}/${advisor.cupo_maximo} proyectos activos</div>
            <div class="profile-card__chips">
              ${areaChips}
            </div>
            <div class="mt-auto pt-4">
              ${buttonHtml}
            </div>
          </div>
        `;
      });
      html += '</div>';

      if (!this.myProject) {
        html = `
          <div class="info-box mb-6">
            <span class="material-symbols-outlined">info</span>
            <div>No tienes un proyecto activo. <a href="#/proyecto" style="text-decoration: underline; font-weight: 500;">Crea uno aquí</a> para poder solicitar asesor.</div>
          </div>
        ` + html;
      }

      // TODO(backend): endpoint para que el alumno liste sus advisor-requests enviadas, similar a GET /students/me/team-requests

      resultsContainer.innerHTML = html;

      resultsContainer.querySelectorAll('.btn-solicitar').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const target = e.currentTarget as HTMLButtonElement;
          const id = Number(target.getAttribute('data-id'));
          const nombre = target.getAttribute('data-nombre')!;
          this.openRequestModal(id, nombre);
        });
      });

    } catch (err: any) {
      resultsContainer.innerHTML = '<div class="state-empty"><span class="material-symbols-outlined">error</span><div class="state-empty__title">Error</div><div class="state-empty__msg">' + getErrorMessage(err.code, err.status) + '</div></div>';
    }
  }

  private openRequestModal(id_mentor: number, nombre: string) {
    if (!this.myProject) return;

    let mensajeInput: HTMLTextAreaElement;
    const modal = new Modal({
      id: 'request-modal',
      title: 'Solicitar Asesoría a ' + nombre,
      contentHtml: `
        <div class="form-group">
          <label class="form-label" for="request-mensaje">Mensaje (opcional)</label>
          <textarea id="request-mensaje" class="form-control" placeholder="¡Hola! Nos gustaría que nos asesores en nuestro proyecto porque..."></textarea>
        </div>
      `,
      confirmLabel: 'Enviar Solicitud',
      onConfirm: async (m) => {
        try {
          m.setLoading(true);
          await createAdvisorRequest(this.myProject!.id_proyecto, {
            id_mentor,
            mensaje: mensajeInput.value
          });
          showToast('Solicitud enviada exitosamente', { type: 'success' });
          m.close();
        } catch (err: any) {
          showToast(getErrorMessage(err.code, err.status), { type: 'error' });
        } finally {
          m.setLoading(false);
        }
      }
    });
    
    mensajeInput = modal.bodyEl.querySelector('#request-mensaje') as HTMLTextAreaElement;
    modal.open();
  }
}
