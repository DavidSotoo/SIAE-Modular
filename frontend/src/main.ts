import { renderSidebar, applyStoredTheme, type Rol } from './components/Sidebar.js';
import { PerfilPage } from './pages/PerfilPage.js';
import { BuscarEquipoPage } from './pages/BuscarEquipoPage.js';
import { MiProyectoPage } from './pages/MiProyectoPage.js';
import { BuscarAsesorPage } from './pages/BuscarAsesorPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { CompleteProfilePage } from './pages/CompleteProfilePage.js';
import { MentorDashboardPage } from './pages/MentorDashboardPage.js';
import { AdminDashboardPage } from './pages/AdminDashboardPage.js';
import { renderErrorState } from './pages/ErrorStatePage.js';

// Apply theme ASAP to avoid flash of wrong theme
applyStoredTheme();

function getStoredUser(): { rol?: Rol; codigo_cucei?: string | null } | null {
  const raw = localStorage.getItem('siae_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Página de inicio de cada rol (a donde se redirige tras login o ruta prohibida)
function defaultPathForRole(rol?: Rol): string {
  if (rol === 'admin') return '#/admin';
  if (rol === 'mentor') return '#/mentor';
  return '#/perfil';
}

// Rutas exclusivas de cada rol. /perfil es común a todos (vista básica para mentor/admin).
const ROLE_ONLY_PATHS: Record<string, Rol> = {
  '/equipo': 'alumno',
  '/asesores': 'alumno',
  '/proyecto': 'alumno',
  '/mentor': 'mentor',
  '/admin': 'admin',
};

function handleRoute() {
  const token = localStorage.getItem('siae_token');
  const storedUser = getStoredUser();
  const defaultPath = defaultPathForRole(storedUser?.rol);
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

  // Un alumno que aun no completa su codigo CUCEI (primer login con Google)
  // no puede navegar a ningun lado mas hasta terminar ese paso.
  const needsOnboarding = storedUser?.rol === 'alumno' && storedUser?.codigo_cucei == null;
  if (token && needsOnboarding && path !== '/completar-perfil') {
    window.location.hash = '#/completar-perfil';
    return;
  }

  const requiredRol = ROLE_ONLY_PATHS[path];
  if (requiredRol && storedUser?.rol !== requiredRol) {
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

  if (path === '/completar-perfil') {
    sidebarContainer.style.display = 'none';
    sidebarContainer.innerHTML = '';
    mainContent.innerHTML = '';
    const page = new CompleteProfilePage(mainContent);
    page.render();
    return;
  }

  sidebarContainer.style.display = 'block';
  // Render Sidebar
  renderSidebar(sidebarContainer, path, storedUser?.rol);

  // Clear main content
  mainContent.innerHTML = '';

  // Route
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
    const page = new MentorDashboardPage(mainContent);
    page.render();
  } else if (path === '/admin') {
    const page = new AdminDashboardPage(mainContent);
    page.render();
  } else {
    renderErrorState(mainContent, 'not-found');
  }
}

// Escuchar cambios en el hash
window.addEventListener('hashchange', handleRoute);

// Ruta inicial
handleRoute();
