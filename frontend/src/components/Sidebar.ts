// Sidebar component — renderiza el menu lateral.
// Acepta la ruta activa para marcarla.
export interface SidebarLink { href: string; icon: string; label: string; }
const LINKS: SidebarLink[] = [
  { href: '#/perfil',      icon: 'person',       label: 'Mi Perfil'       },
  { href: '#/equipo',      icon: 'group_search',  label: 'Buscar Equipo'   },
  { href: '#/asesores',    icon: 'school',        label: 'Buscar Asesor'   },
  { href: '#/proyecto',    icon: 'folder_managed',label: 'Mi Proyecto'     },
];
export function renderSidebar(container: HTMLElement, activePath: string): void {
  container.className = 'sidebar';
  container.innerHTML =
    '<div class="sidebar__brand"><h1>SIAE</h1><p>CUCEI · Informática</p></div>' +
    '<nav class="sidebar__nav" aria-label="Navegación principal">' +
    LINKS.map(l =>
      '<a href="' + l.href + '" class="' + ('#' + activePath === l.href ? 'active' : '') + '">' +
      '<span class="material-symbols-outlined">' + l.icon + '</span>' +
      '<span>' + l.label + '</span></a>'
    ).join('') +
    '</nav>' +
    '<div class="sidebar__footer">' +
    '<a href="#" id="btn-logout">' +
    '<span class="material-symbols-outlined">logout</span><span>Cerrar sesión</span>' +
    '</a></div>';
    
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