// Sidebar component — renderiza el menu lateral y el toggle de tema.
// Acepta la ruta activa para marcarla y el rol para filtrar los links.
export interface SidebarLink {
  href: string;
  icon: string;
  label: string;
}
export type Rol = 'alumno' | 'mentor' | 'admin';

const ALUMNO_LINKS: SidebarLink[] = [
  { href: '#/perfil', icon: 'person', label: 'Mi Perfil' },
  { href: '#/equipo', icon: 'group_search', label: 'Buscar Equipo' },
  { href: '#/asesores', icon: 'school', label: 'Buscar Asesor' },
  { href: '#/proyecto', icon: 'folder_managed', label: 'Mi Proyecto' },
];

const MENTOR_LINKS: SidebarLink[] = [
  { href: '#/mentor', icon: 'supervisor_account', label: 'Panel de Asesor' },
  { href: '#/perfil', icon: 'person', label: 'Mi Perfil' },
];

const ADMIN_LINKS: SidebarLink[] = [
  { href: '#/admin', icon: 'admin_panel_settings', label: 'Panel Admin' },
  { href: '#/perfil', icon: 'person', label: 'Mi Perfil' },
];

function linksForRol(rol?: Rol): SidebarLink[] {
  if (rol === 'admin') return ADMIN_LINKS;
  if (rol === 'mentor') return MENTOR_LINKS;
  return ALUMNO_LINKS;
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
  document
    .querySelectorAll('.theme-toggle')
    .forEach((btn) => updateToggleBtn(btn as HTMLButtonElement));
}

function updateToggleBtn(btn: HTMLButtonElement): void {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const icon = btn.querySelector('.material-symbols-outlined')!;
  const label = btn.querySelector('.theme-toggle__label')!;
  icon.textContent = isDark ? 'dark_mode' : 'light_mode';
  label.textContent = isDark ? 'Modo oscuro' : 'Modo claro';
  // El nombre accesible debe empezar con el texto visible (WCAG 2.5.3), para
  // que quien usa control por voz pueda activarlo diciendo lo que ve.
  btn.setAttribute('aria-label', label.textContent + ', cambiar tema');
}

// ─── Navegacion movil ──────────────────────────────────────────────────────
// En pantallas estrechas el menu es un cajon lateral. Se abre con el boton
// de la barra superior y se cierra al navegar, al tocar fuera o con Escape.

const ID_BACKDROP = 'sidebar-backdrop';

function cerrarCajon(): void {
  document.querySelector('.sidebar')?.classList.remove('is-open');
  document.getElementById(ID_BACKDROP)?.classList.add('hidden');
  document.getElementById('btn-menu')?.setAttribute('aria-expanded', 'false');
}

function abrirCajon(): void {
  document.querySelector('.sidebar')?.classList.add('is-open');
  document.getElementById(ID_BACKDROP)?.classList.remove('hidden');
  const btn = document.getElementById('btn-menu');
  btn?.setAttribute('aria-expanded', 'true');
  // El foco pasa al menu para que no se quede detras del cajon.
  (document.querySelector('.sidebar__nav a') as HTMLElement | null)?.focus();
}

function montarBackdrop(): HTMLElement {
  let el = document.getElementById(ID_BACKDROP);
  if (!el) {
    el = document.createElement('div');
    el.id = ID_BACKDROP;
    el.className = 'sidebar-backdrop hidden';
    el.addEventListener('click', cerrarCajon);
    document.body.appendChild(el);
  }
  return el;
}

/** Barra superior con el boton de menu. Solo se ve en movil (lo decide el CSS). */
export function renderTopbar(container: HTMLElement): void {
  container.className = 'topbar';
  container.innerHTML =
    '<button class="btn btn--icon" id="btn-menu" aria-label="Abrir menú" aria-expanded="false" aria-controls="sidebar-container">' +
    '<span class="material-symbols-outlined">menu</span></button>' +
    '<span class="topbar__title">SIAE</span>';

  montarBackdrop();
  container.querySelector('#btn-menu')!.addEventListener('click', abrirCajon);
}

// ─── Render ────────────────────────────────────────────────────────────────

export function renderSidebar(container: HTMLElement, activePath: string, rol?: Rol): void {
  container.className = 'sidebar';
  // El contenedor es el landmark de navegacion: asi el logo y el pie (tema,
  // cerrar sesion) quedan dentro de una region, en vez de sueltos fuera de
  // todo landmark (axe: regla "region"). El menu interno deja de ser <nav>
  // para no anidar dos landmarks de navegacion.
  container.setAttribute('role', 'navigation');
  container.setAttribute('aria-label', 'Menú lateral');
  container.innerHTML =
    '<div class="sidebar__brand"><h1>SIAE</h1><p>CUCEI · Informática</p></div>' +
    '<div class="sidebar__nav">' +
    linksForRol(rol)
      .map(
        (l) =>
          '<a href="' +
          l.href +
          '" class="' +
          ('#' + activePath === l.href ? 'active' : '') +
          '">' +
          '<span class="material-symbols-outlined">' +
          l.icon +
          '</span>' +
          '<span>' +
          l.label +
          '</span></a>',
      )
      .join('') +
    '</div>' +
    '<div class="sidebar__footer">' +
    // Theme toggle pill
    '<button class="theme-toggle" id="btn-theme">' +
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

  // Al elegir una seccion el cajon estorba, asi que se cierra solo.
  container.querySelectorAll('.sidebar__nav a').forEach((a) => {
    a.addEventListener('click', cerrarCajon);
  });
}

// Escape cierra el cajon. Se registra una sola vez, no en cada render.
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') cerrarCajon();
});
