// ChipSelector — selector multi-select de chips con nivel opcional.
// Generico: sirve para skills (con nivel) y para areas (sin nivel).
import type { NivelSkill } from '../types/index.js';
export interface ChipItem { id: number; label: string; category?: string; }
export interface ChipSelection { id: number; nivel?: NivelSkill; }
export interface ChipSelectorOptions {
  container: HTMLElement;
  items: ChipItem[];
  initial?: ChipSelection[];
  withLevel?: boolean;  // true para skills, false para areas
  chipClass?: (item: ChipItem) => string;
  onChange?: (selected: ChipSelection[]) => void;
}
const NIVELES: NivelSkill[] = ['basico', 'intermedio', 'avanzado'];
const NIVEL_LABEL: Record<NivelSkill, string> = { basico: 'Básico', intermedio: 'Intermedio', avanzado: 'Avanzado' };
export class ChipSelector {
  private selected = new Map<number, ChipSelection>();
  constructor(private opts: ChipSelectorOptions) {
    if (opts.initial) opts.initial.forEach(s => this.selected.set(s.id, s));
    this.render();
  }
  private render(): void {
    const { container, items, withLevel, chipClass, onChange } = this.opts;
    container.innerHTML = '';
    if (items.length === 0) {
      container.innerHTML = '<div class="form-hint">No hay opciones disponibles por el momento.</div>';
      return;
    }
    items.forEach(item => {
      const sel = this.selected.get(item.id);
      const isSelected = !!sel;
      const chip = document.createElement('button');
      chip.type = 'button';
      const extra = chipClass ? chipClass(item) : '';
      chip.className = 'chip chip--selectable' + (extra ? ' ' + extra : '') + (isSelected ? ' chip--selected' : '');
      chip.dataset.id = String(item.id);
      chip.setAttribute('aria-pressed', String(isSelected));
      let inner = '<span>' + item.label + '</span>';
      if (isSelected && withLevel) {
        const nivel = sel!.nivel ?? 'basico';
        inner += '<select class="chip-level-select" aria-label="Nivel de ' + item.label + '">';
        NIVELES.forEach(n => {
          inner += '<option value="' + n + '"' + (nivel === n ? ' selected' : '') + '>' + NIVEL_LABEL[n] + '</option>';
        });
        inner += '</select>';
      }
      chip.innerHTML = inner;
      chip.addEventListener('click', (e) => {
        const sel2 = e.target as HTMLElement;
        if (sel2.tagName === 'SELECT' || sel2.tagName === 'OPTION') return;
        e.preventDefault();
        if (this.selected.has(item.id)) {
          this.selected.delete(item.id);
        } else {
          this.selected.set(item.id, { id: item.id, nivel: withLevel ? 'basico' : undefined });
        }
        this.render();
        onChange?.(this.getValue());
      });
      if (isSelected && withLevel) {
        const select = chip.querySelector('select') as HTMLSelectElement;
        select.addEventListener('change', (e) => {
          e.stopPropagation();
          const entry = this.selected.get(item.id);
          if (entry) {
            entry.nivel = (e.target as HTMLSelectElement).value as NivelSkill;
            onChange?.(this.getValue());
          }
        });
      }
      container.appendChild(chip);
    });
  }
  getValue(): ChipSelection[] {
    return Array.from(this.selected.values());
  }
  reset(): void {
    this.selected.clear();
    this.render();
    this.opts.onChange?.(this.getValue());
  }
}