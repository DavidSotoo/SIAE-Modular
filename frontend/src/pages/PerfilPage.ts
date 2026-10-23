import {
  getMyProfile,
  getSkills,
  getAreas,
  updateMyProfile,
  createSkill,
} from '../services/student.service.js';
import { getMe } from '../services/auth.service.js';
import { escapeHtml, safeUrl } from '../utils/escapeHtml.js';
import { skeletonPerfil } from '../components/Skeleton.js';
import {
  validarCampo,
  bloquearHastaValido,
  semestreValido,
  urlValida,
} from '../utils/validacion.js';
import { mensajeDeError } from '../services/errorMessages.js';
import { showToast } from '../components/Toast.js';
import { ChipSelector } from '../components/ChipSelector.js';
import type {
  Skill,
  Area,
  StudentProfile,
  StudentProfileUpdate,
  DisponibilidadTipo,
  EstadoBusqueda,
} from '../types/index.js';
import { icono, type NombreIcono } from '../utils/iconos.js';

const ROL_LABEL: Record<string, string> = {
  alumno: 'Alumno',
  mentor: 'Asesor',
  admin: 'Administrador',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const DISPONIBILIDAD_LABEL: Record<string, string> = {
  tiempo_completo: 'Tiempo completo',
  medio_tiempo: 'Medio tiempo',
  fines_de_semana: 'Fines de semana',
  flexible: 'Flexible',
};

const NIVEL_LABEL: Record<string, string> = {
  basico: 'Básico',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
};

const ESTADO_LABEL: Record<string, { label: string; cls: string; icon: NombreIcono }> = {
  buscando_equipo: { label: 'Buscando equipo', cls: 'pv-badge--status-searching', icon: 'search' },
  en_equipo: { label: 'En equipo', cls: 'pv-badge--status-team', icon: 'group' },
  no_disponible: { label: 'No disponible', cls: 'pv-badge--status-unavailable', icon: 'block' },
};

function initials(nombre: string): string {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('');
}

function avatarContent(nombre: string, foto_url: string | null): string {
  const letters = escapeHtml(initials(nombre));
  const url = safeUrl(foto_url);
  // Si la foto no carga, utils/respaldoImagenes.ts la cambia por las
  // iniciales. Sin onerror en linea: la CSP no permite scripts en atributos.
  return url
    ? `<img src="${escapeHtml(url)}" alt="" referrerpolicy="no-referrer" data-respaldo="iniciales" data-initials="${letters}">`
    : letters;
}

// ─── Component ───────────────────────────────────────────────────────────────

export class PerfilPage {
  private container: HTMLElement;
  private profile: StudentProfile | null = null;
  private skills: Skill[] = [];
  private areas: Area[] = [];
  private mode: 'view' | 'edit' = 'view';

  private hardSkillsSelector?: ChipSelector;
  private softSkillsSelector?: ChipSelector;
  private areasSelector?: ChipSelector;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  async render() {
    this.container.innerHTML = skeletonPerfil();

    try {
      const me = await getMe();

      if (me.rol !== 'alumno') {
        this.buildBasicView(me);
        return;
      }

      const [profile, skills, areas] = await Promise.all([getMyProfile(), getSkills(), getAreas()]);
      this.profile = profile;
      this.skills = skills;
      this.areas = areas;
      this.mode = 'view';
      this.buildView();
    } catch (err) {
      this.container.innerHTML =
        '<div class="state-empty">' +
        icono('error') +
        '<div class="state-empty__title">Error</div>' +
        '<div class="state-empty__msg">' +
        mensajeDeError(err) +
        '</div>' +
        '</div>';
    }
  }

  // ─── Vista básica para mentor/admin (sin perfil de alumno) ────────────────

  private buildBasicView(me: {
    nombre: string;
    email: string | null;
    rol: string;
    foto_url: string | null;
  }) {
    const avatarInner = avatarContent(me.nombre, me.foto_url);

    this.container.innerHTML = `
      <div class="profile-view">
        <div class="pv-hero">
          <div class="pv-cover"></div>
          <div class="pv-hero-body">
            <div class="pv-avatar">${avatarInner}</div>
            <div class="pv-hero-info">
              <div class="pv-name">${escapeHtml(me.nombre)}</div>
              ${
                me.email
                  ? `<div class="pv-code">
                ${icono('mail')}
                ${escapeHtml(me.email)}
              </div>`
                  : ''
              }
              <div class="pv-badges">
                <span class="pv-badge pv-badge--semestre">
                  ${icono('badge')}
                  ${ROL_LABEL[me.rol] ?? me.rol}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ─── VIEW MODE (LinkedIn-style) ──────────────────────────────────────────

  private buildView() {
    if (!this.profile) return;
    const p = this.profile;

    const estado = ESTADO_LABEL[p.estado_busqueda] ?? ESTADO_LABEL['no_disponible'];
    const avatarInner = avatarContent(p.nombre, p.foto_url);

    const hardSkills = p.skills.filter((s) => s.tipo === 'hard');
    const softSkills = p.skills.filter((s) => s.tipo === 'soft');

    const skillChips = (list: typeof hardSkills, cls: string) =>
      list.length === 0
        ? '<span class="pv-empty-hint">Ninguna todavía.</span>'
        : list
            .map(
              (s) =>
                `<span class="pv-skill-chip pv-skill-chip--${cls}">
              ${escapeHtml(s.nombre)}
              ${cls === 'hard' ? `<span class="pv-skill-chip-level">· ${escapeHtml(NIVEL_LABEL[s.nivel] ?? s.nivel)}</span>` : ''}
            </span>`,
            )
            .join('');

    const areaChips =
      p.areas.length === 0
        ? `<p class="pv-empty-hint">Indica qué temas te interesan para encontrar proyectos afines.</p><button type="button" class="btn btn--ghost btn--sm pv-empty-action">Agregar áreas</button>`
        : p.areas
            .map(
              (a) => `<span class="pv-area-chip">${icono('label')}${escapeHtml(a.nombre)}</span>`,
            )
            .join('');

    const bioSection = p.bio
      ? `<div class="pv-card">
           <div class="pv-card-title">${icono('person')}Sobre mí</div>
           <p class="pv-bio-text">${escapeHtml(p.bio)}</p>
         </div>`
      : '';

    const portafolioHref = safeUrl(p.portafolio_url);
    const portafolioSection = portafolioHref
      ? `<div class="pv-card">
           <div class="pv-card-title">${icono('link')}Portafolio / LinkedIn</div>
           <a class="pv-link" href="${escapeHtml(portafolioHref)}" target="_blank" rel="noopener noreferrer">
             ${icono('open_in_new')}
             ${escapeHtml(portafolioHref)}
           </a>
         </div>`
      : '';

    this.container.innerHTML = `
      <div class="profile-view">

        <!-- Hero card -->
        <div class="pv-hero">
          <div class="pv-cover"></div>
          <div class="pv-hero-body">
            <div class="pv-avatar">${avatarInner}</div>
            <div class="pv-hero-info">
              <div class="pv-name">${escapeHtml(p.nombre)}</div>
              <div class="pv-code">
                ${icono('badge')}
                ${escapeHtml(p.codigo_cucei)}
              </div>
              <div class="pv-badges">
                <span class="pv-badge ${estado.cls}">
                  ${icono(estado.icon)}
                  ${estado.label}
                </span>
                ${
                  p.semestre
                    ? `<span class="pv-badge pv-badge--semestre">
                  ${icono('school')}
                  Semestre ${p.semestre}
                </span>`
                    : ''
                }
                ${
                  p.disponibilidad
                    ? `<span class="pv-badge pv-badge--disponibilidad">
                  ${icono('schedule')}
                  ${DISPONIBILIDAD_LABEL[p.disponibilidad]}
                </span>`
                    : ''
                }
              </div>
            </div>
            <div class="pv-hero-actions">
              <button id="edit-profile-btn" class="btn btn--primary">
                ${icono('edit')}
                Editar perfil
              </button>
            </div>
          </div>
        </div>

        ${bioSection}
        ${portafolioSection}

        <!-- Skills card -->
        <div class="pv-card">
          <div class="pv-card-title">${icono('code')}Habilidades</div>
          ${
            hardSkills.length > 0 || softSkills.length > 0
              ? `
            <div class="pv-skills-group">
              <div class="pv-skills-group-label">Habilidades técnicas</div>
              <div class="pv-skills-list">${skillChips(hardSkills, 'hard')}</div>
            </div>
            <div class="pv-skills-group">
              <div class="pv-skills-group-label">Habilidades blandas</div>
              <div class="pv-skills-list">${skillChips(softSkills, 'soft')}</div>
            </div>
          `
              : `<p class="pv-empty-hint">Agrega tus habilidades para que otros equipos te encuentren.</p><button type="button" class="btn btn--ghost btn--sm pv-empty-action">Agregar habilidades</button>`
          }
        </div>

        <!-- Areas card -->
        <div class="pv-card">
          <div class="pv-card-title">${icono('category')}Áreas de interés</div>
          <div class="pv-areas-list">${areaChips}</div>
        </div>

      </div>
    `;

    // Los estados vacios llevan al mismo formulario que "Editar perfil".
    this.container.querySelectorAll('#edit-profile-btn, .pv-empty-action').forEach((btn) =>
      btn.addEventListener('click', () => {
        this.mode = 'edit';
        this.buildForm();
      }),
    );
  }

  // ─── EDIT MODE (form) ────────────────────────────────────────────────────

  private buildForm() {
    if (!this.profile) return;

    this.container.innerHTML = `
      <div class="section-header">
        <div class="seccion-cabecera seccion-cabecera--inicio">
          <button id="back-to-view-btn" class="btn btn--ghost btn--sm">
            ${icono('arrow_back')}
            Ver perfil
          </button>
          <h2>Editar perfil</h2>
        </div>
        <p>Actualiza tu información, habilidades y áreas de interés.</p>
      </div>
      
      <form id="perfil-form" class="card card--lg">
        <div class="form-group">
          <label class="form-label" for="semestre">Semestre</label>
          <input type="number" id="semestre" name="semestre" class="form-control" min="1" max="12" value="${this.profile.semestre || ''}">
          <div id="semestre-error" class="form-error hidden"></div>
        </div>

        <div class="form-group">
          <label class="form-label" for="bio">Biografía</label>
          <textarea id="bio" name="bio" class="form-control" placeholder="Cuéntanos un poco sobre ti...">${this.profile.bio || ''}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label" for="portafolio_url">Portafolio o LinkedIn (URL)</label>
          <input type="url" id="portafolio_url" name="portafolio_url" class="form-control" value="${this.profile.portafolio_url || ''}">
          <div id="portafolio-error" class="form-error hidden"></div>
        </div>

        <div class="form-group">
          <label class="form-label" for="disponibilidad">Disponibilidad</label>
          <select id="disponibilidad" name="disponibilidad" class="form-control">
            <option value="">Selecciona...</option>
            <option value="tiempo_completo" ${this.profile.disponibilidad === 'tiempo_completo' ? 'selected' : ''}>Tiempo completo</option>
            <option value="medio_tiempo" ${this.profile.disponibilidad === 'medio_tiempo' ? 'selected' : ''}>Medio tiempo</option>
            <option value="fines_de_semana" ${this.profile.disponibilidad === 'fines_de_semana' ? 'selected' : ''}>Fines de semana</option>
            <option value="flexible" ${this.profile.disponibilidad === 'flexible' ? 'selected' : ''}>Flexible</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="estado_busqueda">Estado de búsqueda</label>
          <select id="estado_busqueda" name="estado_busqueda" class="form-control" required>
            <option value="buscando_equipo" ${this.profile.estado_busqueda === 'buscando_equipo' ? 'selected' : ''}>Buscando equipo</option>
            <option value="en_equipo" ${this.profile.estado_busqueda === 'en_equipo' ? 'selected' : ''}>En equipo</option>
            <option value="no_disponible" ${this.profile.estado_busqueda === 'no_disponible' ? 'selected' : ''}>No disponible</option>
          </select>
        </div>

        <hr class="divider">

        <div id="hard-skills-header" class="mb-4"></div>
        <div id="hard-skills-container"></div>

        <div id="soft-skills-header" class="mb-4 mt-6"></div>
        <div id="soft-skills-container"></div>

        <div id="areas-header" class="mb-4 mt-6"></div>
        <div id="areas-container"></div>

        <div class="mt-8 acciones-fila acciones-fila--fin">
          <button type="button" id="cancel-edit-btn" class="btn btn--outlined">Cancelar</button>
          <button type="submit" class="btn btn--primary" id="save-btn">
            ${icono('save')}
            Guardar perfil
          </button>
        </div>
      </form>
    `;

    const hardSkillItems = this.skills
      .filter((s) => s.tipo === 'hard')
      .map((s) => ({ id: s.id_skill, label: s.nombre }));
    const softSkillItems = this.skills
      .filter((s) => s.tipo === 'soft')
      .map((s) => ({ id: s.id_skill, label: s.nombre }));
    const areasItems = this.areas.map((a) => ({ id: a.id_area, label: a.nombre }));

    const userHardSkills = this.profile.skills
      .filter((s) => s.tipo === 'hard')
      .map((s) => ({ id: s.id_skill, nivel: s.nivel }));
    const userSoftSkills = this.profile.skills
      .filter((s) => s.tipo === 'soft')
      .map((s) => ({ id: s.id_skill, nivel: s.nivel }));
    const userAreas = this.profile.areas.map((a) => ({ id: a.id_area }));

    this.hardSkillsSelector = new ChipSelector({
      container: document.getElementById('hard-skills-container')!,
      items: hardSkillItems,
      initial: userHardSkills,
      withLevel: true,
      category: 'hard',
      emptyLabel: 'No se encontraron habilidades. Prueba con otro término.',
      onCreateItem: async (label: string) => {
        const newSkill = await createSkill(label, 'hard');
        this.skills.push(newSkill);
        return { id: newSkill.id_skill, label: newSkill.nombre, category: 'hard' };
      },
    });
    this.hardSkillsSelector.mountHeader(
      document.getElementById('hard-skills-header')!,
      'Habilidades técnicas',
    );

    this.softSkillsSelector = new ChipSelector({
      container: document.getElementById('soft-skills-container')!,
      items: softSkillItems,
      initial: userSoftSkills,
      withLevel: false,
      category: 'soft',
      emptyLabel: 'No se encontraron habilidades. Prueba con otro término.',
      onCreateItem: async (label: string) => {
        const newSkill = await createSkill(label, 'soft');
        this.skills.push(newSkill);
        return { id: newSkill.id_skill, label: newSkill.nombre, category: 'soft' };
      },
    });
    this.softSkillsSelector.mountHeader(
      document.getElementById('soft-skills-header')!,
      'Habilidades blandas',
    );

    this.areasSelector = new ChipSelector({
      container: document.getElementById('areas-container')!,
      items: areasItems,
      initial: userAreas,
      withLevel: false,
      category: 'area',
      emptyLabel: 'No se encontraron áreas. Prueba con otro término.',
    });
    this.areasSelector.mountHeader(document.getElementById('areas-header')!, 'Áreas de interés');

    document.getElementById('perfil-form')!.addEventListener('submit', (e) => this.handleSubmit(e));

    // Antes estos dos solo se validaban al guardar, despues de rellenar todo.
    const btnGuardar = document.getElementById('save-btn') as HTMLButtonElement;
    let revisarFormulario = () => {};
    const campos = [
      validarCampo({
        input: document.getElementById('semestre') as HTMLInputElement,
        errorEl: document.getElementById('semestre-error')!,
        validar: semestreValido,
        alCambiar: () => revisarFormulario(),
      }),
      validarCampo({
        input: document.getElementById('portafolio_url') as HTMLInputElement,
        errorEl: document.getElementById('portafolio-error')!,
        validar: urlValida,
        alCambiar: () => revisarFormulario(),
      }),
    ];
    revisarFormulario = bloquearHastaValido(btnGuardar, campos);
    document.getElementById('back-to-view-btn')!.addEventListener('click', () => {
      this.mode = 'view';
      this.buildView();
    });
    document.getElementById('cancel-edit-btn')!.addEventListener('click', () => {
      this.mode = 'view';
      this.buildView();
    });
  }

  // ─── Form submit ─────────────────────────────────────────────────────────

  private async handleSubmit(e: Event) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;

    const semestreInput = document.getElementById('semestre') as HTMLInputElement;
    const urlInput = document.getElementById('portafolio_url') as HTMLInputElement;
    const semestreErr = document.getElementById('semestre-error')!;
    const urlErr = document.getElementById('portafolio-error')!;
    const btn = document.getElementById('save-btn') as HTMLButtonElement;

    // Reset errors
    semestreInput.classList.remove('is-invalid');
    urlInput.classList.remove('is-invalid');
    semestreErr.classList.add('hidden');
    urlErr.classList.add('hidden');

    // Validation
    const semestre = semestreInput.value ? parseInt(semestreInput.value, 10) : null;
    let hasError = false;

    if (semestre !== null && (semestre < 1 || semestre > 12)) {
      semestreInput.classList.add('is-invalid');
      semestreErr.textContent = 'El semestre debe estar entre 1 y 12';
      semestreErr.classList.remove('hidden');
      hasError = true;
    }

    const portafolio_url = urlInput.value.trim();
    if (portafolio_url) {
      try {
        new URL(portafolio_url);
      } catch (_) {
        urlInput.classList.add('is-invalid');
        urlErr.textContent = 'Debe ser una URL válida';
        urlErr.classList.remove('hidden');
        hasError = true;
      }
    }

    if (hasError) return;

    const formData = new FormData(form);
    const hs = this.hardSkillsSelector!.getValue().map((s) => ({
      id_skill: s.id,
      nivel: s.nivel!,
    }));
    const ss = this.softSkillsSelector!.getValue().map((s) => ({
      id_skill: s.id,
      nivel: s.nivel!,
    }));
    const ar = this.areasSelector!.getValue().map((a) => a.id);

    const payload: StudentProfileUpdate = {
      semestre,
      bio: (formData.get('bio') as string) || null,
      portafolio_url: portafolio_url || null,
      disponibilidad: (formData.get('disponibilidad') as DisponibilidadTipo | null) || null,
      estado_busqueda: formData.get('estado_busqueda') as EstadoBusqueda,
      skills: [...hs, ...ss],
      areas: ar,
    };

    try {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Guardando...';

      const updated = await updateMyProfile(payload);
      this.profile = updated;

      showToast('Perfil guardado exitosamente', { type: 'success' });

      // After save, switch back to view
      this.mode = 'view';
      this.buildView();
    } catch (err) {
      showToast(mensajeDeError(err), {
        type: 'error',
        title: 'Error al guardar',
      });
      btn.disabled = false;
      btn.innerHTML = icono('save') + ' Guardar perfil';
    }
  }
}
