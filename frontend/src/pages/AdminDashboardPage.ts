import {
  listAdminProjects,
  getAdminStats,
  getAdminProjectDetail,
  exportProjectsCsv,
  exportProjectsXlsx,
  triggerBlobDownload,
} from '../services/admin.service.js';
import { getErrorMessage } from '../services/errorMessages.js';
import { showToast } from '../components/Toast.js';
import { Modal } from '../components/Modal.js';
import type { AdminProjectRow, AdminProjectFilters, ProjectState } from '../types/index.js';

const ESTADOS: ProjectState[] = ['borrador', 'pendiente', 'validado', 'registrado', 'correccion', 'cancelado'];

export class AdminDashboardPage {
  private container: HTMLElement;
  private filters: AdminProjectFilters = {};

  constructor(container: HTMLElement) {
    this.container = container;
  }

  async render() {
    this.container.innerHTML = '<div class="state-loading"><span class="spinner"></span> Cargando panel...</div>';
    try {
      await this.buildLayout();
    } catch (err: any) {
      this.container.innerHTML = '<div class="state-empty"><span class="material-symbols-outlined">error</span><div class="state-empty__title">Error</div><div class="state-empty__msg">' + getErrorMessage(err.code, err.status) + '</div></div>';
    }
  }

  private async buildLayout() {
    const stats = await getAdminStats();

    const statTiles = [
      { label: 'Proyectos totales', value: stats.total_proyectos },
      { label: 'Folios emitidos', value: stats.total_folios },
      { label: 'En revisión', value: stats.por_estado['pendiente'] ?? 0 },
      { label: 'Registrados', value: stats.por_estado['registrado'] ?? 0 },
    ];

    this.container.innerHTML = `
      <div class="section-header">
        <h2>Panel Administrativo</h2>
        <p>Consulta todos los proyectos y folios del sistema, y expórtalos para reportes.</p>
      </div>

      <div class="cards-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: var(--sp-6);">
        ${statTiles.map(t => `
          <div class="stat-tile">
            <div class="stat-tile__value">${t.value}</div>
            <div class="stat-tile__label">${t.label}</div>
          </div>
        `).join('')}
      </div>

      <form id="admin-filters" class="filters-bar">
        <div class="form-group">
          <label class="form-label text-label-sm" for="filter-estado">Estado</label>
          <select id="filter-estado" class="form-control">
            <option value="">Cualquiera</option>
            ${ESTADOS.map(e => `<option value="${e}">${e.charAt(0).toUpperCase() + e.slice(1)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="flex: 2;">
          <label class="form-label text-label-sm" for="filter-search">Buscar por título o folio</label>
          <input type="text" id="filter-search" class="form-control" placeholder="Ej. Sistema Integral, A001-26A...">
        </div>
        <div class="form-group" style="flex: 0 0 auto;">
          <button type="submit" class="btn btn--primary"><span class="material-symbols-outlined">search</span> Filtrar</button>
        </div>
        <div class="form-group" style="flex: 0 0 auto; display: flex; gap: var(--sp-2);">
          <button type="button" class="btn btn--secondary btn--sm" id="btn-export-csv"><span class="material-symbols-outlined">download</span> CSV</button>
          <button type="button" class="btn btn--secondary btn--sm" id="btn-export-xlsx"><span class="material-symbols-outlined">download</span> Excel</button>
        </div>
      </form>

      <div id="admin-table-container"></div>
    `;

    const form = document.getElementById('admin-filters') as HTMLFormElement;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const estado = (document.getElementById('filter-estado') as HTMLSelectElement).value;
      const search = (document.getElementById('filter-search') as HTMLInputElement).value.trim();
      this.filters = {
        estado: estado ? (estado as ProjectState) : undefined,
        search: search || undefined,
      };
      this.loadTable();
    });

    document.getElementById('btn-export-csv')!.addEventListener('click', () => this.handleExport('csv'));
    document.getElementById('btn-export-xlsx')!.addEventListener('click', () => this.handleExport('xlsx'));

    await this.loadTable();
  }

  private async loadTable() {
    const tableContainer = document.getElementById('admin-table-container')!;
    tableContainer.innerHTML = '<div class="state-loading"><span class="spinner"></span> Cargando proyectos...</div>';

    try {
      const projects = await listAdminProjects(this.filters);

      if (projects.length === 0) {
        tableContainer.innerHTML = '<div class="state-empty"><span class="material-symbols-outlined">folder_off</span><div class="state-empty__title">Sin resultados</div><div class="state-empty__msg">No hay proyectos que coincidan con los filtros.</div></div>';
        return;
      }

      tableContainer.innerHTML = `
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Título</th>
                <th>Estado</th>
                <th>Mentor</th>
                <th>Integrantes</th>
                <th>Creado</th>
              </tr>
            </thead>
            <tbody>
              ${projects.map(p => this.renderRow(p)).join('')}
            </tbody>
          </table>
        </div>
      `;

      tableContainer.querySelectorAll('tr[data-id]').forEach(row => {
        row.addEventListener('click', () => {
          const id = Number(row.getAttribute('data-id'));
          this.openDetailModal(id);
        });
      });
    } catch (err: any) {
      tableContainer.innerHTML = '<div class="state-empty"><span class="material-symbols-outlined">error</span><div class="state-empty__title">Error</div><div class="state-empty__msg">' + getErrorMessage(err.code, err.status) + '</div></div>';
    }
  }

  private renderRow(p: AdminProjectRow): string {
    const fecha = new Date(p.created_at).toLocaleDateString();
    return `
      <tr data-id="${p.id_proyecto}">
        <td>${p.codigo_folio ?? '<span class="text-muted">—</span>'}</td>
        <td>${p.titulo}</td>
        <td><span class="badge badge--${p.estado_actual}">${p.estado_actual}</span></td>
        <td>${p.mentor_nombre ?? '<span class="text-muted">Sin asignar</span>'}</td>
        <td>${p.num_integrantes}</td>
        <td>${fecha}</td>
      </tr>
    `;
  }

  private async openDetailModal(id_proyecto: number) {
    const modal = new Modal({
      id: 'admin-detail-modal',
      title: 'Detalle del Proyecto',
      contentHtml: '<div class="state-loading"><span class="spinner"></span></div>',
      confirmLabel: 'Cerrar',
      confirmClass: 'btn--ghost',
      onConfirm: (m) => m.close(),
    });
    modal.open();

    try {
      const detail = await getAdminProjectDetail(id_proyecto);

      const membersHtml = detail.miembros.map(m =>
        `<div class="text-label">${m.nombre} <span class="text-muted">(${m.codigo_cucei})</span></div>`
      ).join('');

      const historyHtml = detail.historial.length === 0
        ? '<div class="text-muted">Sin historial registrado.</div>'
        : '<div class="timeline">' + detail.historial.map(log => `
            <div class="timeline-item">
              <div class="timeline-marker"></div>
              <div class="timeline-content">
                <div class="text-label-sm text-muted">${new Date(log.timestamp).toLocaleString()}</div>
                <div>Cambio de <strong>${log.estado_anterior ?? 'N/A'}</strong> a <strong>${log.estado_nuevo}</strong></div>
                ${log.comentario ? `<div class="text-label mt-1 text-muted">"${log.comentario}"</div>` : ''}
              </div>
            </div>
          `).join('') + '</div>';

      modal.bodyEl.innerHTML = `
        <div class="mb-4">
          <div class="text-label-sm text-muted">TÍTULO</div>
          <div class="text-title">${detail.titulo}</div>
        </div>
        <div class="mb-4" style="display:flex; gap: var(--sp-6);">
          <div>
            <div class="text-label-sm text-muted">ESTADO</div>
            <span class="badge badge--${detail.estado_actual}">${detail.estado_actual}</span>
          </div>
          <div>
            <div class="text-label-sm text-muted">FOLIO</div>
            <div class="text-label">${detail.codigo_folio ?? '—'}</div>
          </div>
          <div>
            <div class="text-label-sm text-muted">MENTOR</div>
            <div class="text-label">${detail.mentor_nombre ?? 'Sin asignar'}</div>
          </div>
        </div>
        <hr class="divider">
        <div class="mb-4">
          <div class="text-label-sm text-muted mb-2">EQUIPO</div>
          ${membersHtml}
        </div>
        <hr class="divider">
        <div>
          <div class="text-label-sm text-muted mb-2">HISTORIAL</div>
          ${historyHtml}
        </div>
      `;
    } catch (err: any) {
      modal.bodyEl.innerHTML = `<div class="state-empty"><span class="material-symbols-outlined">error</span><div class="state-empty__msg">${getErrorMessage(err.code, err.status)}</div></div>`;
    }
  }

  private async handleExport(format: 'csv' | 'xlsx') {
    try {
      showToast('Generando exportación...', { type: 'info' });
      const blob = format === 'csv'
        ? await exportProjectsCsv(this.filters)
        : await exportProjectsXlsx(this.filters);
      const filename = format === 'csv' ? 'proyectos_siae.csv' : 'proyectos_siae.xlsx';
      triggerBlobDownload(blob, filename);
      showToast('Exportación descargada.', { type: 'success' });
    } catch (err: any) {
      showToast(getErrorMessage(err.code, err.status), { type: 'error' });
    }
  }
}
