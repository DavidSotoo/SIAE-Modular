import { getMyProfile, getSkills, getAreas, updateMyProfile } from '../services/student.service.js';
import { getErrorMessage } from '../services/errorMessages.js';
import { showToast } from '../components/Toast.js';
import { ChipSelector } from '../components/ChipSelector.js';
import type { Skill, Area, StudentProfile, StudentProfileUpdate } from '../types/index.js';

export class PerfilPage {
  private container: HTMLElement;
  private profile: StudentProfile | null = null;
  private skills: Skill[] = [];
  private areas: Area[] = [];

  private hardSkillsSelector?: ChipSelector;
  private softSkillsSelector?: ChipSelector;
  private areasSelector?: ChipSelector;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  async render() {
    this.container.innerHTML = '<div class="state-loading"><span class="spinner"></span> Cargando perfil...</div>';

    try {
      const [profile, skills, areas] = await Promise.all([
        getMyProfile(),
        getSkills(),
        getAreas()
      ]);
      this.profile = profile;
      this.skills = skills;
      this.areas = areas;
      this.buildForm();
    } catch (err: any) {
      this.container.innerHTML = '<div class="state-empty"><span class="material-symbols-outlined">error</span><div class="state-empty__title">Error</div><div class="state-empty__msg">' + getErrorMessage(err.code, err.status) + '</div></div>';
    }
  }

  private buildForm() {
    if (!this.profile) return;

    this.container.innerHTML = `
      <div class="section-header">
        <h2>Mi Perfil</h2>
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

        <div class="mt-8 flex justify-end">
          <button type="submit" class="btn btn--primary" id="save-btn">Guardar Perfil</button>
        </div>
      </form>
    `;

    const hardSkills = this.skills.filter(s => s.tipo === 'hard').map(s => ({ id: s.id_skill, label: s.nombre }));
    const softSkills = this.skills.filter(s => s.tipo === 'soft').map(s => ({ id: s.id_skill, label: s.nombre }));
    const areasItems = this.areas.map(a => ({ id: a.id_area, label: a.nombre }));

    const userHardSkills = this.profile.skills.filter(s => s.tipo === 'hard').map(s => ({ id: s.id_skill, nivel: s.nivel }));
    const userSoftSkills = this.profile.skills.filter(s => s.tipo === 'soft').map(s => ({ id: s.id_skill, nivel: s.nivel }));
    const userAreas = this.profile.areas.map(a => ({ id: a.id_area }));

    this.hardSkillsSelector = new ChipSelector({
      container: document.getElementById('hard-skills-container')!,
      items: hardSkills,
      initial: userHardSkills,
      withLevel: true,
      category: 'hard',
      emptyLabel: 'No se encontraron habilidades. Prueba con otro término.',
    });
    this.hardSkillsSelector.mountHeader(
      document.getElementById('hard-skills-header')!,
      'Hard Skills',
    );

    this.softSkillsSelector = new ChipSelector({
      container: document.getElementById('soft-skills-container')!,
      items: softSkills,
      initial: userSoftSkills,
      withLevel: true,
      category: 'soft',
      emptyLabel: 'No se encontraron habilidades. Prueba con otro término.',
    });
    this.softSkillsSelector.mountHeader(
      document.getElementById('soft-skills-header')!,
      'Soft Skills',
    );

    this.areasSelector = new ChipSelector({
      container: document.getElementById('areas-container')!,
      items: areasItems,
      initial: userAreas,
      withLevel: false,
      category: 'area',
      emptyLabel: 'No se encontraron áreas. Prueba con otro término.',
    });
    this.areasSelector.mountHeader(
      document.getElementById('areas-header')!,
      'Áreas de Interés',
    );

    const form = document.getElementById('perfil-form') as HTMLFormElement;
    form.addEventListener('submit', (e) => this.handleSubmit(e));
  }

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

    // Build payload
    const formData = new FormData(form);
    
    const hs = this.hardSkillsSelector!.getValue().map(s => ({ id_skill: s.id, nivel: s.nivel! }));
    const ss = this.softSkillsSelector!.getValue().map(s => ({ id_skill: s.id, nivel: s.nivel! }));
    const ar = this.areasSelector!.getValue().map(a => a.id);

    const payload: StudentProfileUpdate = {
      semestre: semestre,
      bio: formData.get('bio') as string || null,
      portafolio_url: portafolio_url || null,
      disponibilidad: (formData.get('disponibilidad') as any) || null,
      estado_busqueda: formData.get('estado_busqueda') as any,
      skills: [...hs, ...ss],
      areas: ar
    };

    try {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Guardando...';
      
      const updated = await updateMyProfile(payload);
      this.profile = updated;
      
      showToast('Perfil guardado exitosamente', { type: 'success' });
    } catch (err: any) {
      showToast(getErrorMessage(err.code, err.status), { type: 'error', title: 'Error al guardar' });
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar Perfil';
    }
  }
}