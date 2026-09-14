import { renderSidebar, applyStoredTheme } from './components/Sidebar.js';
import { PerfilPage } from './pages/PerfilPage.js';
import { BuscarEquipoPage } from './pages/BuscarEquipoPage.js';
import { MiProyectoPage } from './pages/MiProyectoPage.js';
import { BuscarAsesorPage } from './pages/BuscarAsesorPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { MentorDashboardPage } from './pages/MentorDashboardPage.js';
import { AdminDashboardPage } from './pages/AdminDashboardPage.js';

// Apply theme ASAP to avoid flash of wrong theme
applyStoredTheme();

function getStoredRole(): string | null {
  const rawUser = localStorage.getItem('siae_user');
  if (!rawUser) return null;
  try {
    return JSON.parse(rawUser).rol ?? null;
  } catch {
    return null;
  }
}

function defaultPathForRole(rol: string | null): string {
  if (rol === 'admin') return '#/admin';
  if (rol === 'mentor') return '#/mentor';
  return '#/perfil';
}

const ALUMNO_PATHS = ['/perfil', '/equipo', '/proyecto', '/asesores'];

function handleRoute() {
  const token = localStorage.getItem('siae_token');
  const rol = getStoredRole();
  const defaultPath = defaultPathForRole(rol);
  const hash = window.location.hash || defaultPath;
  const path = hash.slice(1);

  if (!token && path !== '/login') {
    window.location.hash = '#/login';
    return;
  }

  if (token && path === '/login') {
    window.location.hash = defaultPath;
    return;
  }

  const sidebarContainer = document.getElementById('sidebar-container')!;
  const mainContent = document.getElementById('main-content')!;

  if (path === '/login') {
    sidebarContainer.style.display = 'none';
    sidebarContainer.innerHTML = '';
    mainContent.innerHTML = '';
    const page = new LoginPage(mainContent);
    page.render();
    return;
  }
  
  sidebarContainer.style.display = 'block';
  // Render Sidebar
  renderSidebar(sidebarContainer, path);

  // Clear main content
  mainContent.innerHTML = '';

  // Route
  if (ALUMNO_PATHS.includes(path) && rol !== 'alumno') {
    window.location.hash = defaultPath;
    return;
  }

  if (path === '/perfil') {
    const page = new PerfilPage(mainContent);
    page.render();
  } else if (path === '/equipo') {
    const page = new BuscarEquipoPage(mainContent);
    page.render();
  } else if (path === '/proyecto') {
    const page = new MiProyectoPage(mainContent);
    page.render();
  } else if (path === '/asesores') {
    const page = new BuscarAsesorPage(mainContent);
    page.render();
  } else if (path === '/mentor') {
    if (rol !== 'mentor') {
      window.location.hash = defaultPath;
      return;
    }
    const page = new MentorDashboardPage(mainContent);
    page.render();
  } else if (path === '/admin') {
    if (rol !== 'admin') {
      window.location.hash = defaultPath;
      return;
    }
    const page = new AdminDashboardPage(mainContent);
    page.render();
  } else {
    mainContent.innerHTML = '<div class="state-empty"><span class="material-symbols-outlined">explore_off</span><div class="state-empty__title">Página no encontrada</div></div>';
  }
}

// Escuchar cambios en el hash
window.addEventListener('hashchange', handleRoute);

// Ruta inicial
handleRoute();