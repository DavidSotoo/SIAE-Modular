import { listMentorAdvisorRequests, acceptAdvisorRequest, rejectAdvisorRequest } from '../services/mentor.service.js';
import { getMentorProjects, getProjectHistory, downloadProtocol, approveProject, rejectProject } from '../services/project.service.js';
import { getErrorMessage } from '../services/errorMessages.js';
import { showToast } from '../components/Toast.js';
import { Modal } from '../components/Modal.js';
import type { AdvisorRequest, Project } from '../types/index.js';

export class MentorDashboardPage {
  private container: HTMLElement;
  private projects: Project[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
  }

  async render() {
    this.container.innerHTML = '<div class="state-loading"><span class="spinner"></span> Cargando panel...</div>';
    try {
      this.buildLayout();
    } catch (err: any) {
      this.container.innerHTML = '<div class="state-empty"><span class="material-symbols-outlined">error</span><div class="state-empty__title">Error</div><div class="state-empty__msg">' + getErrorMessage(err.code, err.status) + '</div></div>';
    }
  }

  private buildLayout() {
    this.container.innerHTML = `
      <div class="section-header">
        <h2>Panel de Asesor</h2>
        <p>Revisa solicitudes de asesoría y da seguimiento a los protocolos de tus proyectos.</p>
      </div>

      <h3 class="text-title mb-4">Solicitudes de Asesoría</h3>
      <div id="requests-container" class="cards-grid mb-8"></div>

      <h3 class="text-title mb-4">Mis Proyectos Asesorados</h3>
      <div id="projects-container"></div>
    `;

    this.loadRequests();
    this.loadProjects();
  }

  // ─── Solicitudes de asesoría ─────────────────────────────────────────────

  private async loadRequests() {
    const container = document.getElementById('requests-container')!;
    container.innerHTML = '<div class="state-loading"><span class="spinner"></span></div>';

    try {
      const requests = await listMentorAdvisorRequests();
      const pendientes = requests.filter(r => r.estado === 'pendiente');

      if (pendientes.length === 0) {
        container.innerHTML = '<p class="text-muted">No tienes solicitudes de asesoría pendientes.</p>';
        return;
      }

      container.innerHTML = pendientes.map(r => this.renderRequestCard(r)).join('');

      container.querySelectorAll('.btn-accept-req').forEach(btn =>
        btn.addEventListener('click', (e) => this.handleRequestAction(e, 'accept')));
      container.querySelectorAll('.btn-reject-req').forEach(btn =>
        btn.addEventListener('click', (e) => this.handleRequestAction(e, 'reject')));
    } catch (err: any) {
      container.innerHTML = '<div class="text-error">' + getErrorMessage(err.code, err.status) + '</div>';
    }
  }

  private renderRequestCard(r: AdvisorRequest): string {
    return `
      <div class="request-card">
        <div class="request-card__header">
          <div class="request-card__from">${r.titulo_proyecto ?? 'Proyecto #' + r.id_proyecto}</div>
          <div class="badge badge--pendiente">PENDIENTE</div>
        </div>
        ${r.mensaje ? `<div class="request-card__msg">"${r.mensaje}"</div>` : ''}
        <div class="request-card__meta">Recibida: ${new Date(r.created_at).toLocaleDateString()}</div>
        <div class="request-card__actions">
          <button class="btn btn--sm btn--primary btn-accept-req" data-id="${r.id_solicitud}">Aceptar</button>
          <button class="btn btn--sm btn--ghost btn-reject-req" data-id="${r.id_solicitud}">Rechazar</button>
        </div>
      </div>
    `;
  }

  private async handleRequestAction(e: Event, action: 'accept' | 'reject') {
    const btn = e.currentTarget as HTMLButtonElement;
    const id = Number(btn.getAttribute('data-id'));
    const originalText = btn.textContent;

    try {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>';

      if (action === 'accept') await acceptAdvisorRequest(id);
      else await rejectAdvisorRequest(id);

      showToast(action === 'accept' ? 'Solicitud aceptada' : 'Solicitud rechazada', { type: 'success' });
      this.loadRequests();
      this.loadProjects();
    } catch (err: any) {
      showToast(getErrorMessage(err.code, err.status), { type: 'error' });
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  // ─── Proyectos asesorados ────────────────────────────────────────────────

  private async loadProjects() {
    const container = document.getElementById('projects-container')!;
    container.innerHTML = '<div class="state-loading"><span class="spinner"></span></div>';

    try {
      this.projects = await getMentorProjects();

      if (this.projects.length === 0) {
        container.innerHTML = '<div class="state-empty"><span class="material-symbols-outlined">folder_off</span><div class="state-empty__title">Sin proyectos asignados</div><div class="state-empty__msg">Cuando aceptes una solicitud de asesoría, el proyecto aparecerá aquí.</div></div>';
        return;
      }

      container.innerHTML = `
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Título</th>
                <th>Estado</th>
                <th>Equipo</th>
              </tr>
            </thead>
            <tbody>
              ${this.projects.map(p => `
                <tr data-id="${p.id_proyecto}">
                  <td>${p.codigo_folio ?? '<span class="text-muted">—</span>'}</td>
                  <td>${p.titulo}</td>
                  <td><span class="badge badge--${p.estado_actual}">${p.estado_actual}</span></td>
                  <td>${p.miembros.map(m => m.nombre).join(', ')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      container.querySelectorAll('tr[data-id]').forEach(row => {
        row.addEventListener('click', () => {
          const id = Number(row.getAttribute('data-id'));
          const project = this.projects.find(p => p.id_proyecto === id)!;
          this.openProjectModal(project);
        });
      });
    } catch (err: any) {
      container.innerHTML = '<div class="state-empty"><span class="material-symbols-outlined">error</span><div class="state-empty__title">Error</div><div class="state-empty__msg">' + getErrorMessage(err.code, err.status) + '</div></div>';
    }
  }

  private async openProjectModal(project: Project) {
    const canReview = project.estado_actual === 'pendiente';

    const modal = new Modal({
      id: 'mentor-project-modal',
      title: project.titulo,
      contentHtml: '<div class="state-loading"><span class="spinner"></span></div>',
      confirmLabel: 'Cerrar',
      confirmClass: 'btn--ghost',
      onConfirm: (m) => m.close(),
    });
    modal.open();

    const viewBtnHtml = project.pdf_path
      ? '<button class="btn btn--ghost btn--sm" id="btn-view-protocol"><span class="material-symbols-outlined">description</span> Ver protocolo</button>'
      : '<div class="text-muted">Aún no se ha subido un protocolo.</div>';

    const reviewActionsHtml = canReview ? `
      <div class="mt-4" style="display:flex; gap: var(--sp-2);">
        <button class="btn btn--primary btn--sm" id="btn-approve">Aprobar y registrar</button>
        <button class="btn btn--danger btn--sm" id="btn-reject">Rechazar con correcciones</button>
      </div>
    ` : '';

    modal.bodyEl.innerHTML = `
      <div class="mb-4" style="display:flex; gap: var(--sp-6); align-items:center;">
        <span class="badge badge--${project.estado_actual}">${project.estado_actual}</span>
        ${project.codigo_folio ? `<span class="badge badge--folio">Folio: ${project.codigo_folio}</span>` : ''}
      </div>
      <div class="mb-4">
        <div class="text-label-sm text-muted mb-2">EQUIPO</div>
        ${project.miembros.map(m => `<div class="text-label">${m.nombre} <span class="text-muted">(${m.codigo_cucei})</span></div>`).join('')}
      </div>
      <hr class="divider">
      <div class="mb-4">
        <div class="text-label-sm text-muted mb-2">DOCUMENTACIÓN</div>
        ${viewBtnHtml}
        ${reviewActionsHtml}
      </div>
      <hr class="divider">
      <div>
        <div class="text-label-sm text-muted mb-2">HISTORIAL</div>
        <div id="mentor-history">Cargando...</div>
      </div>
    `;

    const viewBtn = document.getElementById('btn-view-protocol');
    viewBtn?.addEventListener('click', async () => {
      try {
        const blob = await downloadProtocol(project.id_proyecto);
        window.open(URL.createObjectURL(blob), '_blank');
      } catch (err: any) {
        showToast(getErrorMessage(err.code, err.status), { type: 'error' });
      }
    });

    document.getElementById('btn-approve')?.addEventListener('click', async () => {
      try {
        const result = await approveProject(project.id_proyecto);
        showToast('Proyecto aprobado. Folio: ' + result.codigo_folio, { type: 'success' });
        modal.close();
        this.loadProjects();
      } catch (err: any) {
        showToast(getErrorMessage(err.code, err.status), { type: 'error' });
      }
    });

    document.getElementById('btn-reject')?.addEventListener('click', () => {
      modal.close();
      this.openRejectModal(project);
    });

    try {
      const history = await getProjectHistory(project.id_proyecto);
      const historyContainer = document.getElementById('mentor-history')!;
      if (history.length === 0) {
        historyContainer.innerHTML = '<div class="text-muted">Sin historial registrado.</div>';
      } else {
        historyContainer.innerHTML = '<div class="timeline">' + history.map(log => `
          <div class="timeline-item">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <div class="text-label-sm text-muted">${new Date(log.timestamp).toLocaleString()}</div>
              <div>Cambio de <strong>${log.estado_anterior ?? 'N/A'}</strong> a <strong>${log.estado_nuevo}</strong></div>
              ${log.comentario ? `<div class="text-label mt-1 text-muted">"${log.comentario}"</div>` : ''}
            </div>
          </div>
        `).join('') + '</div>';
      }
    } catch {
      const historyContainer = document.getElementById('mentor-history');
      if (historyContainer) historyContainer.innerHTML = '<div class="text-muted">Historial no disponible.</div>';
    }
  }

  private openRejectModal(project: Project) {
    let comentarioInput: HTMLTextAreaElement;
    const modal = new Modal({
      id: 'mentor-reject-modal',
      title: 'Rechazar protocolo — ' + project.titulo,
      contentHtml: `
        <div class="form-group">
          <label class="form-label" for="reject-comentario">Comentario de corrección (obligatorio)</label>
          <textarea id="reject-comentario" class="form-control" placeholder="Explica qué debe corregir el equipo antes de volver a enviar el protocolo..."></textarea>
        </div>
      `,
      confirmLabel: 'Rechazar',
      confirmClass: 'btn--danger',
      onConfirm: async (m) => {
        const comentario = comentarioInput.value.trim();
        if (!comentario) {
          showToast('El comentario es obligatorio', { type: 'error' });
          return;
        }
        try {
          m.setLoading(true);
          await rejectProject(project.id_proyecto, comentario);
          showToast('Proyecto rechazado con comentarios', { type: 'success' });
          m.close();
          this.loadProjects();
        } catch (err: any) {
          showToast(getErrorMessage(err.code, err.status), { type: 'error' });
        } finally {
          m.setLoading(false);
        }
      },
    });

    comentarioInput = modal.bodyEl.querySelector('#reject-comentario') as HTMLTextAreaElement;
    modal.open();
  }
}
