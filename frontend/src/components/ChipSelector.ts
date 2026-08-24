// ChipSelector v2 — selector multi-select con buscador inline y nivel integrado.
// Genérico: sirve para skills (con nivel y segmented control) y para áreas (sin nivel).
//
// Props nuevas vs. v1:
//   category?: 'hard' | 'soft' | 'area'  — aplica la paleta correcta automáticamente.
//   emptyLabel?: string                   — texto del estado vacío cuando la búsqueda no arroja resultados.
//
// La prop chipClass se mantiene por compatibilidad pero category tiene precedencia cuando
// ambas están presentes, evitando duplicar la lógica de color.
//
// CONTRATO PÚBLICO INMUTABLE: getValue() sigue devolviendo ChipSelection[], idéntico a v1.

import type { NivelSkill } from '../types/index.js';

export interface ChipItem { id: number; label: string; category?: string; }
export interface ChipSelection { id: number; nivel?: NivelSkill; }

export interface ChipSelectorOptions {
  container: HTMLElement;
  items: ChipItem[];
  initial?: ChipSelection[];
  withLevel?: boolean;       // true para skills (muestra segmented control), false para áreas
  chipClass?: (item: ChipItem) => string; // Compatibilidad retroactiva; ignorado si category está presente
  category?: 'hard' | 'soft' | 'area';   // Categoría semántica → paleta visual automática
  emptyLabel?: string;       // Texto del estado vacío en búsqueda sin resultados
  onChange?: (selected: ChipSelection[]) => void;
}

const NIVELES: NivelSkill[] = ['basico', 'intermedio', 'avanzado'];
const NIVEL_LABEL: Record<NivelSkill, string> = {
  basico: 'Básico',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
};

export class ChipSelector {
  private selected = new Map<number, ChipSelection>();
  private searchQuery = '';

  constructor(private opts: ChipSelectorOptions) {
    if (opts.initial) opts.initial.forEach(s => this.selected.set(s.id, s));
    this.render();
  }

  // ─── Utilidades privadas ────────────────────────────────────────────────────

  /** Devuelve el sufijo de categoría para clases CSS (ej. 'hard', 'soft', 'area'). */
  private categoryKey(): string {
    if (this.opts.category) return this.opts.category;
    // Retrocompatibilidad: si solo se pasa chipClass, intenta extraer el sufijo
    if (this.opts.chipClass) {
      const cls = this.opts.chipClass({ id: 0, label: '' });
      if (cls.includes('hard')) return 'hard';
      if (cls.includes('soft')) return 'soft';
      if (cls.includes('area')) return 'area';
    }
    return 'hard';
  }

  /** Normaliza texto para búsqueda: minúsculas sin diacríticos. */
  private normalize(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  }

  /** Lista de items filtrada por la búsqueda actual. */
  private filteredItems(): ChipItem[] {
    if (!this.searchQuery) return this.opts.items;
    const q = this.normalize(this.searchQuery);
    return this.opts.items.filter(it => this.normalize(it.label).includes(q));
  }

  // ─── Render principal ────────────────────────────────────────────────────────

  private render(): void {
    const { container, withLevel, emptyLabel, onChange } = this.opts;
    const cat = this.categoryKey();
    const isArea = cat === 'area';
    const items = this.filteredItems();
    const selectedIds = new Set(this.selected.keys());

    container.innerHTML = '';
    container.className = 'cs-section';

    // ── Zona de seleccionados (para hard/soft) o zona única (para área) ──
    if (!isArea) {
      // Área de chips seleccionados
      const selectedZone = document.createElement('div');
      selectedZone.className = 'cs-selected-zone';

      const selectedItems = this.opts.items.filter(it => selectedIds.has(it.id));
      if (selectedItems.length === 0) {
        selectedZone.innerHTML = '<div class="cs-placeholder">Haz clic en una habilidad para agregarla</div>';
      } else {
        selectedItems.forEach(item => {
          const sel = this.selected.get(item.id)!;
          selectedZone.appendChild(this.buildSelectedChip(item, sel, cat, onChange));
        });
      }
      container.appendChild(selectedZone);
    }

    // ── Chips disponibles ──
    const availableZone = document.createElement('div');
    availableZone.className = 'cs-available-zone';

    const availableItems = isArea ? items : items.filter(it => !selectedIds.has(it.id));

    if (availableItems.length === 0 && this.searchQuery) {
      // Estado vacío de búsqueda
      const empty = document.createElement('div');
      empty.className = 'cs-empty-state';
      empty.innerHTML =
        '<span class="material-symbols-outlined">search_off</span>' +
        '<div class="cs-empty-state__title">Sin resultados</div>' +
        '<div class="cs-empty-state__msg">' + (emptyLabel ?? 'No se encontraron opciones. Prueba con otro término.') + '</div>';
      availableZone.appendChild(empty);
    } else {
      availableItems.forEach(item => {
        if (isArea) {
          availableZone.appendChild(this.buildAreaChip(item, selectedIds.has(item.id), onChange));
        } else {
          availableZone.appendChild(this.buildAvailableChip(item, cat, onChange));
        }
      });
    }

    container.appendChild(availableZone);
  }

  // ─── Builders de chips ───────────────────────────────────────────────────────

  private buildSelectedChip(
    item: ChipItem,
    sel: ChipSelection,
    cat: string,
    onChange?: (s: ChipSelection[]) => void,
  ): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = `cs-chip-selected cs-chip-selected--${cat}`;
    wrapper.setAttribute('aria-label', item.label);

    // Label
    const labelSpan = document.createElement('span');
    labelSpan.textContent = item.label;
    wrapper.appendChild(labelSpan);

    // Segmented control de nivel (solo si withLevel)
    if (this.opts.withLevel) {
      const control = document.createElement('div');
      control.className = 'cs-level-control';
      const currentNivel: NivelSkill = sel.nivel ?? 'basico';

      NIVELES.forEach(nivel => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cs-level-btn';
        btn.textContent = NIVEL_LABEL[nivel];
        btn.setAttribute('aria-pressed', String(nivel === currentNivel));
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const entry = this.selected.get(item.id);
          if (entry) {
            entry.nivel = nivel;
            onChange?.(this.getValue());
            this.render();
          }
        });
        control.appendChild(btn);
      });
      wrapper.appendChild(control);
    }

    // Botón quitar
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'cs-chip-remove';
    removeBtn.setAttribute('aria-label', `Quitar ${item.label}`);
    removeBtn.innerHTML = '<span class="material-symbols-outlined">close</span>';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selected.delete(item.id);
      onChange?.(this.getValue());
      this.render();
    });
    wrapper.appendChild(removeBtn);

    return wrapper;
  }

  private buildAvailableChip(
    item: ChipItem,
    cat: string,
    onChange?: (s: ChipSelection[]) => void,
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `cs-chip-available cs-chip-available--${cat}`;
    btn.innerHTML = '<span class="material-symbols-outlined">add</span>' + item.label;
    btn.addEventListener('click', () => {
      this.selected.set(item.id, {
        id: item.id,
        nivel: this.opts.withLevel ? 'basico' : undefined,
      });
      onChange?.(this.getValue());
      this.render();
    });
    return btn;
  }

  private buildAreaChip(
    item: ChipItem,
    isSelected: boolean,
    onChange?: (s: ChipSelection[]) => void,
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';

    if (isSelected) {
      btn.className = 'cs-chip-area-selected';
      btn.innerHTML = '<span class="material-symbols-outlined">check</span>' + item.label;
      btn.setAttribute('aria-pressed', 'true');
      btn.addEventListener('click', () => {
        this.selected.delete(item.id);
        onChange?.(this.getValue());
        this.render();
      });
    } else {
      btn.className = 'cs-chip-available cs-chip-available--area';
      btn.setAttribute('aria-pressed', 'false');
      btn.textContent = item.label;
      btn.addEventListener('click', () => {
        this.selected.set(item.id, { id: item.id });
        onChange?.(this.getValue());
        this.render();
      });
    }

    return btn;
  }

  // ─── API pública — CONTRATO INMUTABLE ────────────────────────────────────────

  /** Devuelve el mismo shape que v1: ChipSelection[] */
  getValue(): ChipSelection[] {
    return Array.from(this.selected.values());
  }

  reset(): void {
    this.selected.clear();
    this.searchQuery = '';
    this.render();
    this.opts.onChange?.(this.getValue());
  }

  // ─── Método para montar el header (título + buscador) fuera del container ───
  // Se llama desde PerfilPage después de construir el ChipSelector para poder
  // insertar el header en el lugar correcto del DOM del formulario.

  mountHeader(headerEl: HTMLElement, title: string): void {
    headerEl.className = 'cs-header';
    headerEl.innerHTML =
      `<h3 class="text-title">${title}</h3>` +
      `<div class="cs-search-wrap">` +
      `<label class="hidden" style="position:absolute;width:1px;height:1px;overflow:hidden" for="cs-search-${title}">Buscar ${title}</label>` +
      `<span class="material-symbols-outlined" aria-hidden="true">search</span>` +
      `<input id="cs-search-${title}" type="text" class="cs-search-input" placeholder="Buscar...">` +
      `</div>`;

    const input = headerEl.querySelector('.cs-search-input') as HTMLInputElement;
    input.addEventListener('input', () => {
      this.searchQuery = input.value.trim();
      this.render();
    });
  }
}