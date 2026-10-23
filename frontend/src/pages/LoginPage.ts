import { loginWithGoogle } from '../services/auth.service.js';
import { mensajeDeError } from '../services/errorMessages.js';
import { ApiRequestError } from '../services/api.js';
import { showToast } from '../components/Toast.js';
import { icono } from '../utils/iconos.js';

// Client ID del proyecto `siae-modular` en Google Cloud. No es secreto, así que
// va en el repo; VITE_GOOGLE_CLIENT_ID en .env lo sobrescribe si hace falta.
const DEFAULT_GOOGLE_CLIENT_ID =
  '997402371394-p2mamuu4v3m14lg0chp1ic7967s0srgh.apps.googleusercontent.com';

/**
 * Resuelve true cuando el cliente de Google Identity esta disponible, o false
 * si su script falla o no llega a tiempo.
 */
function esperarGoogle(limiteMs = 10_000): Promise<boolean> {
  if (window.google) return Promise.resolve(true);
  const script = document.querySelector<HTMLScriptElement>(
    'script[src*="accounts.google.com/gsi/client"]',
  );
  if (!script) return Promise.resolve(false);

  return new Promise((resolve) => {
    const terminar = (ok: boolean) => {
      clearTimeout(limite);
      resolve(ok && !!window.google);
    };
    const limite = setTimeout(() => terminar(false), limiteMs);
    script.addEventListener('load', () => terminar(true), { once: true });
    script.addEventListener('error', () => terminar(false), { once: true });
  });
}

export class LoginPage {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  render() {
    // Los estilos viven en main.css (seccion Login): la CSP no admite <style>
    // dentro de las vistas.
    this.container.innerHTML = `
      <div class="login-page-wrapper">
        <!-- BEGIN: TopBar -->
        <header class="login-topbar">
          <div class="login-topbar-left">
            <img src="/escudo-udeg.svg" alt="Logo UdeG" class="login-topbar-logo">
            <div class="login-topbar-text">
              <span class="login-topbar-title">CUCEI</span>
              <span class="login-topbar-subtitle">Universidad de Guadalajara</span>
            </div>
          </div>
        </header>

        <!-- BEGIN: MainContent -->
        <div class="login-main">
          <div class="login-card">
            <div class="login-card-header">
              <div class="login-card-emblem">
                <img src="/escudo-udeg.svg" alt="Escudo Universidad de Guadalajara">
              </div>
              <h1 class="login-card-title">Iniciar sesión</h1>
              <p class="login-card-subtitle">Entra con tu cuenta institucional de Google.</p>
            </div>

            <div class="login-google-area">
              <div id="google-domain-error" class="login-domain-error hidden">
                ${icono('error')}
                <span id="google-domain-error-text"></span>
              </div>
              <div id="google-signin-button"></div>
              <div id="google-fallback" class="login-google-fallback hidden"></div>
              <p class="login-domain-hint">
                Alumnos: cuenta <strong>@alumnos.udg.mx</strong> · Mentores: cuenta <strong>@academicos.udg.mx</strong>
              </p>
            </div>
          </div>
        </div>

        <!-- BEGIN: Footer -->
        <footer class="login-footer">
          <div class="login-footer-links">
            <span class="login-footer-copy">© CUCEI Universidad de Guadalajara</span>
          </div>
        </footer>
      </div>
    `;

    this.initGoogleButton();
  }

  private async initGoogleButton() {
    const clientId =
      (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) || DEFAULT_GOOGLE_CLIENT_ID;
    const buttonContainer = document.getElementById('google-signin-button')!;
    const fallback = document.getElementById('google-fallback')!;

    // El script de Google carga con async: en una primera visita (sin cache)
    // todavia no ha terminado cuando se pinta esta vista. Antes se revisaba
    // una sola vez y se mostraba el error aunque Google llegara un momento
    // despues.
    if (!(await esperarGoogle())) {
      // La vista pudo cambiar mientras se esperaba.
      if (!fallback.isConnected) return;
      fallback.textContent = 'No se pudo cargar Google. Verifica tu conexión y recarga la página.';
      fallback.classList.remove('hidden');
      return;
    }
    if (!buttonContainer.isConnected || !window.google) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => this.handleCredential(response.credential),
    });

    window.google.accounts.id.renderButton(buttonContainer, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'pill',
      width: 320,
    });
  }

  private async handleCredential(idToken: string) {
    const fallback = document.getElementById('google-fallback')!;
    const domainError = document.getElementById('google-domain-error')!;
    const domainErrorText = document.getElementById('google-domain-error-text')!;
    fallback.classList.add('hidden');
    domainError.classList.add('hidden');

    try {
      const res = await loginWithGoogle(idToken);
      localStorage.setItem('siae_token', res.token);
      localStorage.setItem('siae_user', JSON.stringify(res.user));

      if (res.needsOnboarding) {
        window.location.hash = '#/completar-perfil';
        return;
      }

      const roleHomes: Record<string, string> = { mentor: '#/mentor', admin: '#/admin' };
      window.location.hash = roleHomes[res.user.rol] ?? '#/perfil';
    } catch (err) {
      const message = mensajeDeError(err);
      if (err instanceof ApiRequestError && err.code === 'DOMAIN_NOT_ALLOWED') {
        domainErrorText.textContent = message;
        domainError.classList.remove('hidden');
      } else {
        showToast(message, { type: 'error' });
      }
    }
  }
}
