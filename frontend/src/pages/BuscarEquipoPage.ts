import { searchStudents, getMyTeamRequests, getProjectTeamRequests, getSkills, getAreas, getMyProfile, createTeamRequest, acceptTeamRequest, rejectTeamRequest, cancelTeamRequest } from '../services/student.service.js';
import { getMyProject } from '../services/project.service.js';
import { getErrorMessage } from '../services/errorMessages.js';
import { showToast } from '../components/Toast.js';
import { Modal } from '../components/Modal.js';
import type { Skill, Area, StudentProfile, StudentSearchResult, TeamRequest, Project } from '../types/index.js';

export class BuscarEquipoPage {
  private container: HTMLElement;
  private myProfile: StudentProfile | null = null;
  private myProject: Project | null = null;
  private skills: Skill[] = [];
  private areas: Area[] = [];
  private requests: TeamRequest[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
  }

  async render() {
    this.container.innerHTML = '<div class="state-loading"><span class="spinner"></span> Cargando página...</div>';
    try {
      const [profile, project, skills, areas] = await Promise.all([
        getMyProfile(),
        getMyProject(),
        getSkills(),
        getAreas()
      ]);
      this.myProfile = profile;
      this.myProject = project;
      this.skills = skills;
      this.areas = areas;
      this.buildLayout();
    } catch (err: any) {
      this.container.innerHTML = '<div class="state-empty"><span class="material-symbols-outlined">error</span><div class="state-empty__title">Error</div><div class="state-empty__msg">' + getErrorMessage(err.code, err.status) + '</div></div>';
    }
  }

  private buildLayout() {
    this.container.innerHTML = `
      <div class="section-header">
        <h2>Buscar Equipo</h2>
        <p>Explora alumnos para invitar o revisa tus solicitudes de equipo.</p>
      </div>
      <div class="tabs">
        <button class="tab-btn active" data-target="tab-explorar">Explorar Alumnos</button>
        <button class="tab-btn" data-target="tab-solicitudes">Solicitudes de Equipo</button>
      </div>
      <div id="tab-explorar" class="tab-panel active">
        <form id="search-form" class="filters-bar">
          <div class="form-group">
            <label class="form-label text-label-sm" for="filter-skill">Habilidad</label>
            <select id="filter-skill" name="skill" class="form-control">
              <option value="">Cualquiera</option>
              ${this.skills.map(s => `<option value="${s.id_skill}">${s.nombre}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label text-label-sm" for="filter-area">Área</label>
            <select id="filter-area" name="area" class="form-control">
              <option value="">Cualquiera</option>
              ${this.areas.map(a => `<option value="${a.id_area}">${a.nombre}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label text-label-sm" for="filter-estado">Estado</label>
            <select id="filter-estado" name="estado_busqueda" class="form-control">
              <option value="buscando_equipo">Buscando Equipo</option>
              <option value="en_equipo">En Equipo</option>
              <option value="no_disponible">No Disponible</option>
              <option value="">Cualquiera</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label text-label-sm" for="filter-semestre">Semestre</label>
            <div style="display:flex; gap: 8px;">
              <input type="number" name="semestre_min" class="form-control" placeholder="Min" min="1" max="12">
              <input type="number" name="semestre_max" class="form-control" placeholder="Max" min="1" max="12">
            </div>
          </div>
          <div class="form-group" style="flex: 0 0 auto;">
            <button type="submit" class="btn btn--primary"><span class="material-symbols-outlined">search</span> Buscar</button>
          </div>
        </form>
        
        <div id="search-results-container"></div>
      </div>
      <div id="tab-solicitudes" class="tab-panel">
        <h3 class="text-title mb-4">Recibidas</h3>
        <div id="req-recibidas" class="cards-grid mb-8"></div>
        <h3 class="text-title mb-4">Enviadas</h3>
        <div id="req-enviadas" class="cards-grid"></div>
      </div>
    `;

    const tabs = this.container.querySelectorAll('.tab-btn');
    const panels = this.container.querySelectorAll('.tab-panel');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.getAttribute('data-target')!;
        document.getElementById(target)!.classList.add('active');
        if (target === 'tab-solicitudes') {
          this.loadSolicitudes();
        }
      });
    });

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
    if (fd.get('skill')) params.skill = Number(fd.get('skill'));
    if (fd.get('area')) params.area = Number(fd.get('area'));
    if (fd.get('estado_busqueda')) params.estado_busqueda = fd.get('estado_busqueda');
    if (fd.get('semestre_min')) params.semestre_min = Number(fd.get('semestre_min'));
    if (fd.get('semestre_max')) params.semestre_max = Number(fd.get('semestre_max'));

    try {
      const students = await searchStudents(params);
      
      if (students.length === 0) {
        resultsContainer.innerHTML = '<div class="state-empty"><span class="material-symbols-outlined">person_search</span><div class="state-empty__title">Sin resultados</div><div class="state-empty__msg">No se encontraron alumnos con esos filtros.</div></div>';
        return;
      }

      const teamIsFull = this.myProject && this.myProject.miembros.length >= 3;

      let html = '<div class="cards-grid">';
      students.forEach(student => {
        if (student.codigo_cucei === this.myProfile?.codigo_cucei) return;
        
        const hardChips = student.skills.filter(s => s.tipo === 'hard').map(s => '<span class="chip chip--hard">' + s.nombre + '</span>').join('');
        const softChips = student.skills.filter(s => s.tipo === 'soft').map(s => '<span class="chip chip--soft">' + s.nombre + '</span>').join('');
        const areaChips = student.areas.map(a => '<span class="chip chip--area">' + a.nombre + '</span>').join('');
        
        let buttonHtml = '';
        if (this.myProject) {
          if (teamIsFull) {
            buttonHtml = '<button class="btn btn--secondary btn--full" disabled title="Tu equipo ya está completo">Equipo completo</button>';
          } else {
            buttonHtml = `<button class="btn btn--primary btn--full btn-invitar" data-codigo="${student.codigo_cucei}" data-nombre="${student.nombre}">Invitar a mi equipo</button>`;
          }
        }

        html += `
          <div class="profile-card">
            <div class="profile-card__header">
              <div class="profile-card__avatar">${student.nombre.charAt(0)}</div>
              <div>
                <div class="profile-card__name">${student.nombre}</div>
                <div class="profile-card__sub">${student.semestre ? 'Semestre ' + student.semestre : 'Semestre no definido'}</div>
              </div>
            </div>
            <div class="profile-card__bio">${student.bio || 'Sin biografía'}</div>
            <div class="profile-card__chips">
              ${hardChips} ${softChips} ${areaChips}
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
            <div>No tienes un proyecto activo. <a href="#/proyecto" style="text-decoration: underline; font-weight: 500;">Crea uno aquí</a> para poder invitar compañeros.</div>
          </div>
        ` + html;
      }

      resultsContainer.innerHTML = html;

      resultsContainer.querySelectorAll('.btn-invitar').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const target = e.currentTarget as HTMLButtonElement;
          const codigo = target.getAttribute('data-codigo')!;
          const nombre = target.getAttribute('data-nombre')!;
          this.openInviteModal(codigo, nombre);
        });
      });

    } catch (err: any) {
      resultsContainer.innerHTML = '<div class="state-empty"><span class="material-symbols-outlined">error</span><div class="state-empty__title">Error</div><div class="state-empty__msg">' + getErrorMessage(err.code, err.status) + '</div></div>';
    }
  }

  private openInviteModal(codigo: string, nombre: string) {
    if (!this.myProject) return;

    let mensajeInput: HTMLTextAreaElement;
    const modal = new Modal({
      id: 'invite-modal',
      title: 'Invitar a ' + nombre,
      contentHtml: `
        <div class="form-group">
          <label class="form-label" for="invite-mensaje">Mensaje (opcional)</label>
          <textarea id="invite-mensaje" class="form-control" placeholder="¡Hola! Me gustaría que te unas a nuestro proyecto..."></textarea>
        </div>
      `,
      confirmLabel: 'Enviar Invitación',
      onConfirm: async (m) => {
        try {
          m.setLoading(true);
          await createTeamRequest(this.myProject!.id_proyecto, {
            tipo: 'invitacion',
            codigo_alumno: codigo,
            mensaje: mensajeInput.value
          });
          showToast('Invitación enviada exitosamente', { type: 'success' });
          m.close();
        } catch (err: any) {
          showToast(getErrorMessage(err.code, err.status), { type: 'error' });
        } finally {
          m.setLoading(false);
        }
      }
    });
    
    mensajeInput = modal.bodyEl.querySelector('#invite-mensaje') as HTMLTextAreaElement;
    modal.open();
  }

  private async loadSolicitudes() {
    const recibidasContainer = document.getElementById('req-recibidas')!;
    const enviadasContainer = document.getElementById('req-enviadas')!;
    
    recibidasContainer.innerHTML = '<div class="state-loading"><span class="spinner"></span></div>';
    enviadasContainer.innerHTML = '<div class="state-loading"><span class="spinner"></span></div>';

    try {
      const p1 = getMyTeamRequests();
      const p2 = this.myProject ? getProjectTeamRequests(this.myProject.id_proyecto) : Promise.resolve([]);
      
      const [personalReqs, projectReqs] = await Promise.all([p1, p2]);
      
      const map = new Map<number, TeamRequest>();
      personalReqs.forEach(r => map.set(r.id_solicitud, r));
      projectReqs.forEach(r => map.set(r.id_solicitud, r));
      
      this.requests = Array.from(map.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const me = this.myProfile!.codigo_cucei;

      const recibidas = this.requests.filter(r => 
        (r.codigo_alumno_candidato === me && r.tipo === 'invitacion') || 
        (r.codigo_alumno_candidato !== me && r.tipo === 'solicitud')
      );

      const enviadas = this.requests.filter(r => 
        (r.codigo_alumno_candidato === me && r.tipo === 'solicitud') ||
        (r.codigo_alumno_candidato !== me && r.tipo === 'invitacion')
      );

      this.renderRequestCards(recibidasContainer, recibidas, true);
      this.renderRequestCards(enviadasContainer, enviadas, false);

    } catch (err: any) {
      recibidasContainer.innerHTML = '<div class="text-error">' + getErrorMessage(err.code, err.status) + '</div>';
      enviadasContainer.innerHTML = '';
    }
  }

  private renderRequestCards(container: HTMLElement, list: TeamRequest[], isRecibida: boolean) {
    if (list.length === 0) {
      container.innerHTML = '<p class="text-muted">No hay solicitudes en esta sección.</p>';
      return;
    }

    let html = '';
    list.forEach(req => {
      const bgClass = req.estado === 'pendiente' ? 'badge--pendiente' : 
                      req.estado === 'aceptada' ? 'badge--aceptada' : 
                      req.estado === 'rechazada' ? 'badge--rechazada' : 'badge--cancelada';
      
      let title = '';
      if (req.tipo === 'invitacion') {
        title = isRecibida ? `Invitación de proyecto ${req.id_proyecto}` : `Invitaste a ${req.codigo_alumno_candidato} al proyecto ${req.id_proyecto}`;
      } else {
        title = isRecibida ? `${req.codigo_alumno_candidato} solicita unirse al proyecto ${req.id_proyecto}` : `Solicitaste unirte al proyecto ${req.id_proyecto}`;
      }

      html += `
        <div class="request-card">
          <div class="request-card__header">
            <div class="request-card__from">${title}</div>
            <div class="badge ${bgClass}">${req.estado.toUpperCase()}</div>
          </div>
          ${req.mensaje ? `<div class="request-card__msg">"${req.mensaje}"</div>` : ''}
          <div class="request-card__meta">Actualizado: ${new Date(req.updated_at).toLocaleDateString()}</div>
          ${req.estado === 'pendiente' ? `
            <div class="request-card__actions">
              ${isRecibida ? `
                <button class="btn btn--sm btn--primary btn-accept" data-id="${req.id_solicitud}">Aceptar</button>
                <button class="btn btn--sm btn--ghost btn-reject" data-id="${req.id_solicitud}">Rechazar</button>
              ` : `
                <button class="btn btn--sm btn--danger btn-cancel" data-id="${req.id_solicitud}">Cancelar</button>
              `}
            </div>
          ` : ''}
        </div>
      `;
    });
    container.innerHTML = html;

    container.querySelectorAll('.btn-accept').forEach(btn => btn.addEventListener('click', e => this.handleAction(e, 'accept')));
    container.querySelectorAll('.btn-reject').forEach(btn => btn.addEventListener('click', e => this.handleAction(e, 'reject')));
    container.querySelectorAll('.btn-cancel').forEach(btn => btn.addEventListener('click', e => this.handleAction(e, 'cancel')));
  }

  private async handleAction(e: Event, action: 'accept' | 'reject' | 'cancel') {
    const btn = e.currentTarget as HTMLButtonElement;
    const id = Number(btn.getAttribute('data-id'));
    const originalText = btn.textContent;
    
    try {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>';
      
      if (action === 'accept') await acceptTeamRequest(id);
      else if (action === 'reject') await rejectTeamRequest(id);
      else if (action === 'cancel') await cancelTeamRequest(id);
      
      showToast('Acción completada', { type: 'success' });
      this.loadSolicitudes(); // Refresh list
    } catch (err: any) {
      showToast(getErrorMessage(err.code, err.status), { type: 'error' });
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }
}