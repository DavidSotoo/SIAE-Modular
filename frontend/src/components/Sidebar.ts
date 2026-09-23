// Sidebar component — renderiza el menu lateral y el toggle de tema.
// Acepta la ruta activa para marcarla y el rol para filtrar los links.
export interface SidebarLink { href: string; icon: string; label: string; }
export type Rol = 'alumno' | 'mentor' | 'admin';

const LINKS: SidebarLink[] = [
  { href: '#/perfil',      icon: 'person',         label: 'Mi Perfil'     },
  { href: '#/equipo',      icon: 'group_search',   label: 'Buscar Equipo' },
  { href: '#/asesores',    icon: 'school',         label: 'Buscar Asesor' },
  { href: '#/proyecto',    icon: 'folder_managed', label: 'Mi Proyecto'   },
];

// Rutas exclusivas de alumno (mentor/admin aun no tienen su propio panel en
// esta rama — solo ven "Mi Perfil" hasta que se integren etapa4/etapa5).
const ALUMNO_ONLY_HREFS = new Set(['#/equipo', '#/asesores', '#/proyecto']);

function linksForRol(rol?: Rol): SidebarLink[] {
  if (rol === 'alumno' || !rol) return LINKS;
  return LINKS.filter(l => !ALUMNO_ONLY_HREFS.has(l.href));
}

// ─── Theme management ──────────────────────────────────────────────────────

const STORAGE_KEY = 'siae_theme';

export function applyStoredTheme(): void {
  const stored = localStorage.getItem(STORAGE_KEY);
  // If no preference stored, respect OS preference
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = stored ? stored === 'dark' : prefersDark;
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

function toggleTheme(): void {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(STORAGE_KEY, next);
  // Update every toggle button in case there are multiple sidebars
  document.querySelectorAll('.theme-toggle').forEach(btn => updateToggleBtn(btn as HTMLButtonElement));
}

function updateToggleBtn(btn: HTMLButtonElement): void {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const icon = btn.querySelector('.material-symbols-outlined')!;
  const label = btn.querySelector('.theme-toggle__label')!;
  icon.textContent = isDark ? 'dark_mode' : 'light_mode';
  label.textContent = isDark ? 'Modo oscuro' : 'Modo claro';
}

// ─── Render ────────────────────────────────────────────────────────────────

export function renderSidebar(container: HTMLElement, activePath: string, rol?: Rol): void {
  container.className = 'sidebar';
  container.innerHTML =
    '<div class="sidebar__brand"><h1>SIAE</h1><p>CUCEI · Informática</p></div>' +
    '<nav class="sidebar__nav" aria-label="Navegación principal">' +
    linksForRol(rol).map(l =>
      '<a href="' + l.href + '" class="' + ('#' + activePath === l.href ? 'active' : '') + '">' +
      '<span class="material-symbols-outlined">' + l.icon + '</span>' +
      '<span>' + l.label + '</span></a>'
    ).join('') +
    '</nav>' +
    '<div class="sidebar__footer">' +
    // Theme toggle pill
    '<button class="theme-toggle" id="btn-theme" aria-label="Cambiar tema">' +
    '<span class="material-symbols-outlined">light_mode</span>' +
    '<span class="theme-toggle__label">Modo claro</span>' +
    '</button>' +
    // Logout
    '<a href="#" id="btn-logout">' +
    '<span class="material-symbols-outlined">logout</span><span>Cerrar sesión</span>' +
    '</a></div>';

  // Init toggle state
  const btnTheme = container.querySelector('#btn-theme') as HTMLButtonElement;
  updateToggleBtn(btnTheme);
  btnTheme.addEventListener('click', () => toggleTheme());

  // Logout
  const btnLogout = container.querySelector('#btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('siae_token');
      localStorage.removeItem('siae_user');
      window.location.hash = '#/login';
    });
  }
}