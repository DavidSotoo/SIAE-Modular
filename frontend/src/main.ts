import { renderSidebar } from './components/Sidebar.js';
import { PerfilPage } from './pages/PerfilPage.js';
import { BuscarEquipoPage } from './pages/BuscarEquipoPage.js';
import { MiProyectoPage } from './pages/MiProyectoPage.js';
import { LoginPage } from './pages/LoginPage.js';

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
  if (path === '/perfil') {
    const page = new PerfilPage(mainContent);
    page.render();
  } else if (path === '/equipo') {
    const page = new BuscarEquipoPage(mainContent);
    page.render();
  } else if (path === '/proyecto') {
    const page = new MiProyectoPage(mainContent);
    page.render();
  } else {
    mainContent.innerHTML = '<div class="state-empty"><span class="material-symbols-outlined">explore_off</span><div class="state-empty__title">Página no encontrada</div></div>';
  }
}

// Escuchar cambios en el hash
window.addEventListener('hashchange', handleRoute);

// Ruta inicial
handleRoute();