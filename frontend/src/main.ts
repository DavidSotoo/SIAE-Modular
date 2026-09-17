import { renderSidebar, applyStoredTheme } from './components/Sidebar.js';
import { PerfilPage } from './pages/PerfilPage.js';
import { BuscarEquipoPage } from './pages/BuscarEquipoPage.js';
import { MiProyectoPage } from './pages/MiProyectoPage.js';
import { BuscarAsesorPage } from './pages/BuscarAsesorPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { CompleteProfilePage } from './pages/CompleteProfilePage.js';

// Apply theme ASAP to avoid flash of wrong theme
applyStoredTheme();

function getStoredUser(): { rol?: string; codigo_cucei?: string | null } | null {
  const raw = localStorage.getItem('siae_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function handleRoute() {
  const hash = window.location.hash || '#/perfil';
  const path = hash.slice(1);
  const token = localStorage.getItem('siae_token');

  if (!token && path !== '/login') {
    window.location.hash = '#/login';
    return;
  }

  if (token && path === '/login') {
    window.location.hash = '#/perfil';
    return;
  }

  // Un alumno que aun no completa su codigo CUCEI (primer login con Google)
  // no puede navegar a ningun lado mas hasta terminar ese paso.
  const storedUser = getStoredUser();
  const needsOnboarding = storedUser?.rol === 'alumno' && storedUser?.codigo_cucei == null;
  if (token && needsOnboarding && path !== '/completar-perfil') {
    window.location.hash = '#/completar-perfil';
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
  renderSidebar(sidebarContainer, path);

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
  } else {
    mainContent.innerHTML = '<div class="state-empty"><span class="material-symbols-outlined">explore_off</span><div class="state-empty__title">Página no encontrada</div></div>';
  }
}

// Escuchar cambios en el hash
window.addEventListener('hashchange', handleRoute);

// Ruta inicial
handleRoute();