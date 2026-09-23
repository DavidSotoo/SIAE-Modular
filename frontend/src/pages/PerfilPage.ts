import { getMyProfile, getSkills, getAreas, updateMyProfile, createSkill } from '../services/student.service.js';
import { getMe } from '../services/auth.service.js';
import { getErrorMessage } from '../services/errorMessages.js';
import { showToast } from '../components/Toast.js';
import { ChipSelector } from '../components/ChipSelector.js';
import type { Skill, Area, StudentProfile, StudentProfileUpdate } from '../types/index.js';

const ROL_LABEL: Record<string, string> = {
  alumno: 'Alumno',
  mentor: 'Mentor / Asesor',
  admin: 'Administrador',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const DISPONIBILIDAD_LABEL: Record<string, string> = {
  tiempo_completo:  'Tiempo completo',
  medio_tiempo:     'Medio tiempo',
  fines_de_semana:  'Fines de semana',
  flexible:         'Flexible',
};

const NIVEL_LABEL: Record<string, string> = {
  basico:     'Básico',
  intermedio: 'Intermedio',
  avanzado:   'Avanzado',
};

const ESTADO_LABEL: Record<string, { label: string; cls: string; icon: string }> = {
  buscando_equipo: { label: 'Buscando equipo',  cls: 'pv-badge--status-searching',   icon: 'search' },
  en_equipo:       { label: 'En equipo',         cls: 'pv-badge--status-team',         icon: 'group' },
  no_disponible:   { label: 'No disponible',     cls: 'pv-badge--status-unavailable',  icon: 'block' },
};

function initials(nombre: string): string {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map(w => w[0] ?? '')
    .join('');
}

function avatarContent(nombre: string, foto_url: string | null): string {
  return foto_url
    ? `<img src="${foto_url}" alt="" referrerpolicy="no-referrer" onerror="this.remove(); this.parentElement.textContent='${initials(nombre)}';">`
    : initials(nombre);
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

  private static skeletonHtml(): string {
    return `
      <div class="sk-hero">
        <div class="skeleton sk-cover"></div>
        <div class="sk-hero-body">
          <div class="skeleton sk-avatar"></div>
          <div class="sk-lines">
            <div class="skeleton sk-line" style="width:180px;height:22px;"></div>
            <div class="skeleton sk-line" style="width:120px;"></div>
            <div class="skeleton sk-line" style="width:140px;height:24px;border-radius:9999px;"></div>
          </div>
        </div>
      </div>
      <div class="sk-card">
        <div class="skeleton sk-line" style="width:140px;"></div>
        <div class="skeleton sk-line" style="width:90%;"></div>
        <div class="skeleton sk-line" style="width:70%;"></div>
      </div>
      <div class="sk-card">
        <div class="skeleton sk-line" style="width:160px;"></div>
        <div class="skeleton sk-line" style="width:80%;"></div>
      </div>
    `;
  }

  async render() {
    this.container.innerHTML = PerfilPage.skeletonHtml();

    try {
      const me = await getMe();

      if (me.rol !== 'alumno') {
        this.buildBasicView(me);
        return;
      }

      const [profile, skills, areas] = await Promise.all([
        getMyProfile(),
        getSkills(),
        getAreas(),
      ]);
      this.profile = profile;
      this.skills = skills;
      this.areas = areas;
      this.mode = 'view';
      this.buildView();
    } catch (err: any) {
      this.container.innerHTML =
        '<div class="state-empty">' +
        '<span class="material-symbols-outlined">error</span>' +
        '<div class="state-empty__title">Error</div>' +
        '<div class="state-empty__msg">' + getErrorMessage(err.code, err.status) + '</div>' +
        '</div>';
    }
  }

  // ─── Vista básica para mentor/admin (sin perfil de alumno) ────────────────

  private buildBasicView(me: { nombre: string; email: string | null; rol: string; foto_url: string | null }) {
    const avatarInner = avatarContent(me.nombre, me.foto_url);

    this.container.innerHTML = `
      <div class="profile-view">
        <div class="pv-hero">
          <div class="pv-cover"></div>
          <div class="pv-hero-body">
            <div class="pv-avatar">${avatarInner}</div>
            <div class="pv-hero-info">
              <div class="pv-name">${me.nombre}</div>
              ${me.email ? `<div class="pv-code">
                <span class="material-symbols-outlined" style="font-size:14px">mail</span>
                ${me.email}
              </div>` : ''}
              <div class="pv-badges">
                <span class="pv-badge pv-badge--semestre">
                  <span class="material-symbols-outlined" style="font-size:13px">badge</span>
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

    const hardSkills = p.skills.filter(s => s.tipo === 'hard');
    const softSkills = p.skills.filter(s => s.tipo === 'soft');

    const skillChips = (list: typeof hardSkills, cls: string) =>
      list.length === 0
        ? '<span class="pv-empty-hint">Sin habilidades registradas aún.</span>'
        : list.map(s =>
            `<span class="pv-skill-chip pv-skill-chip--${cls}">
              ${s.nombre}
              ${cls === 'hard' ? `<span class="pv-skill-chip-level">· ${NIVEL_LABEL[s.nivel] ?? s.nivel}</span>` : ''}
            </span>`
          ).join('');

    const areaChips = p.areas.length === 0
      ? '<span class="pv-empty-hint">Sin áreas de interés registradas aún.</span>'
      : p.areas.map(a => `<span class="pv-area-chip"><span class="material-symbols-outlined" style="font-size:14px">label</span>${a.nombre}</span>`).join('');

    const bioSection = p.bio
      ? `<div class="pv-card">
           <div class="pv-card-title"><span class="material-symbols-outlined">person</span>Sobre mí</div>
           <p class="pv-bio-text">${p.bio}</p>
         </div>`
      : '';

    const portafolioSection = p.portafolio_url
      ? `<div class="pv-card">
           <div class="pv-card-title"><span class="material-symbols-outlined">link</span>Portafolio / LinkedIn</div>
           <a class="pv-link" href="${p.portafolio_url}" target="_blank" rel="noopener">
             <span class="material-symbols-outlined" style="font-size:16px">open_in_new</span>
             ${p.portafolio_url}
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
              <div class="pv-name">${p.nombre}</div>
              <div class="pv-code">
                <span class="material-symbols-outlined" style="font-size:14px">badge</span>
                ${p.codigo_cucei}
              </div>
              <div class="pv-badges">
                <span class="pv-badge ${estado.cls}">
                  <span class="material-symbols-outlined" style="font-size:13px">${estado.icon}</span>
                  ${estado.label}
                </span>
                ${p.semestre ? `<span class="pv-badge pv-badge--semestre">
                  <span class="material-symbols-outlined" style="font-size:13px">school</span>
                  Semestre ${p.semestre}
                </span>` : ''}
                ${p.disponibilidad ? `<span class="pv-badge pv-badge--disponibilidad">
                  <span class="material-symbols-outlined" style="font-size:13px">schedule</span>
                  ${DISPONIBILIDAD_LABEL[p.disponibilidad]}
                </span>` : ''}
              </div>
            </div>
            <div class="pv-hero-actions">
              <button id="edit-profile-btn" class="btn btn--primary">
                <span class="material-symbols-outlined">edit</span>
                Editar perfil
              </button>
            </div>
          </div>
        </div>

        ${bioSection}
        ${portafolioSection}

        <!-- Skills card -->
        <div class="pv-card">
          <div class="pv-card-title"><span class="material-symbols-outlined">code</span>Habilidades</div>
          ${hardSkills.length > 0 || softSkills.length > 0 ? `
            <div class="pv-skills-group">
              <div class="pv-skills-group-label">Hard Skills</div>
              <div class="pv-skills-list">${skillChips(hardSkills, 'hard')}</div>
            </div>
            <div class="pv-skills-group">
              <div class="pv-skills-group-label">Soft Skills</div>
              <div class="pv-skills-list">${skillChips(softSkills, 'soft')}</div>
            </div>
          ` : '<span class="pv-empty-hint">Aún no se han registrado habilidades.</span>'}
        </div>

        <!-- Areas card -->
        <div class="pv-card">
          <div class="pv-card-title"><span class="material-symbols-outlined">category</span>Áreas de Interés</div>
          <div class="pv-areas-list">${areaChips}</div>
        </div>

      </div>
    `;

    document.getElementById('edit-profile-btn')!.addEventListener('click', () => {
      this.mode = 'edit';
      this.buildForm();
    });
  }

  // ─── EDIT MODE (form) ────────────────────────────────────────────────────

  private buildForm() {
    if (!this.profile) return;

    this.container.innerHTML = `
      <div class="section-header">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px;">
          <button id="back-to-view-btn" class="btn btn--outlined" style="display:inline-flex;align-items:center;gap:6px;font-size:14px;padding:6px 14px;">
            <span class="material-symbols-outlined" style="font-size:18px">arrow_back</span>
            Ver perfil
          </button>
          <h2 style="margin:0;">Editar perfil</h2>
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
          <label class="form-label" for="portafolio_url">URL de Portafolio o LinkedIn</label>
          <input type="url" id="portafolio_url" name="portafolio_url" class="form-control" value="${this.profile.portafolio_url || ''}">
          <div id="portafolio-error" class="form-error hidden"></div>
        </div>

        <div class="form-group">
          <label class="form-label" for="disponibilidad">Disponibilidad</label>
          <select id="disponibilidad" name="disponibilidad" class="form-control">
            <option value="">Selecciona...</option>
            <option value="tiempo_completo" ${this.profile.disponibilidad === 'tiempo_completo' ? 'selected' : ''}>Tiempo Completo</option>
            <option value="medio_tiempo" ${this.profile.disponibilidad === 'medio_tiempo' ? 'selected' : ''}>Medio Tiempo</option>
            <option value="fines_de_semana" ${this.profile.disponibilidad === 'fines_de_semana' ? 'selected' : ''}>Fines de Semana</option>
            <option value="flexible" ${this.profile.disponibilidad === 'flexible' ? 'selected' : ''}>Flexible</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="estado_busqueda">Estado de Búsqueda</label>
          <select id="estado_busqueda" name="estado_busqueda" class="form-control" required>
            <option value="buscando_equipo" ${this.profile.estado_busqueda === 'buscando_equipo' ? 'selected' : ''}>Buscando Equipo</option>
            <option value="en_equipo" ${this.profile.estado_busqueda === 'en_equipo' ? 'selected' : ''}>En Equipo</option>
            <option value="no_disponible" ${this.profile.estado_busqueda === 'no_disponible' ? 'selected' : ''}>No Disponible</option>
          </select>
        </div>

        <hr class="divider">

        <div id="hard-skills-header" class="mb-4"></div>
        <div id="hard-skills-container"></div>

        <div id="soft-skills-header" class="mb-4 mt-6"></div>
        <div id="soft-skills-container"></div>

        <div id="areas-header" class="mb-4 mt-6"></div>
        <div id="areas-container"></div>

        <div class="mt-8 flex justify-end" style="gap:12px;">
          <button type="button" id="cancel-edit-btn" class="btn btn--outlined">Cancelar</button>
          <button type="submit" class="btn btn--primary" id="save-btn">
            <span class="material-symbols-outlined">save</span>
            Guardar Perfil
          </button>
        </div>
      </form>
    `;

    const hardSkillItems = this.skills.filter(s => s.tipo === 'hard').map(s => ({ id: s.id_skill, label: s.nombre }));
    const softSkillItems = this.skills.filter(s => s.tipo === 'soft').map(s => ({ id: s.id_skill, label: s.nombre }));
    const areasItems = this.areas.map(a => ({ id: a.id_area, label: a.nombre }));

    const userHardSkills = this.profile.skills.filter(s => s.tipo === 'hard').map(s => ({ id: s.id_skill, nivel: s.nivel }));
    const userSoftSkills = this.profile.skills.filter(s => s.tipo === 'soft').map(s => ({ id: s.id_skill, nivel: s.nivel }));
    const userAreas = this.profile.areas.map(a => ({ id: a.id_area }));

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
    this.hardSkillsSelector.mountHeader(document.getElementById('hard-skills-header')!, 'Hard Skills');

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
    this.softSkillsSelector.mountHeader(document.getElementById('soft-skills-header')!, 'Soft Skills');

    this.areasSelector = new ChipSelector({
      container: document.getElementById('areas-container')!,
      items: areasItems,
      initial: userAreas,
      withLevel: false,
      category: 'area',
      emptyLabel: 'No se encontraron áreas. Prueba con otro término.',
    });
    this.areasSelector.mountHeader(document.getElementById('areas-header')!, 'Áreas de Interés');

    document.getElementById('perfil-form')!.addEventListener('submit', (e) => this.handleSubmit(e));
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
    const hs = this.hardSkillsSelector!.getValue().map(s => ({ id_skill: s.id, nivel: s.nivel! }));
    const ss = this.softSkillsSelector!.getValue().map(s => ({ id_skill: s.id, nivel: s.nivel! }));
    const ar = this.areasSelector!.getValue().map(a => a.id);

    const payload: StudentProfileUpdate = {
      semestre,
      bio: (formData.get('bio') as string) || null,
      portafolio_url: portafolio_url || null,
      disponibilidad: (formData.get('disponibilidad') as any) || null,
      estado_busqueda: formData.get('estado_busqueda') as any,
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
    } catch (err: any) {
      showToast(getErrorMessage(err.code, err.status), { type: 'error', title: 'Error al guardar' });
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined">save</span> Guardar Perfil';
    }
  }
}