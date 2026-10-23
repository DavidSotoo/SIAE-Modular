import { loginWithGoogle } from '../services/auth.service.js';
import { mensajeDeError } from '../services/errorMessages.js';
import { ApiRequestError } from '../services/api.js';
import { showToast } from '../components/Toast.js';
import { icono } from '../utils/iconos.js';

// Client ID del proyecto `siae-modular` en Google Cloud. No es secreto, así que
// va en el repo; VITE_GOOGLE_CLIENT_ID en .env lo sobrescribe si hace falta.
const DEFAULT_GOOGLE_CLIENT_ID =
  '997402371394-p2mamuu4v3m14lg0chp1ic7967s0srgh.apps.googleusercontent.com';

export class LoginPage {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  render() {
    // Los estilos viven en main.css (seccion Login): la CSP no admite <style>
    // dentro de las vistas.
    this.container.innerHTML = `
      <div class="login">
        <div class="login__panel">
          <div class="login__marca">
            <img src="/escudo-udeg.svg" alt="Escudo de la Universidad de Guadalajara" class="login__escudo">
            <div>
              <div class="login__sistema">SIAE</div>
              <div class="login__institucion">CUCEI, Universidad de Guadalajara</div>
            </div>
          </div>

          <h1 class="login__titulo">Iniciar sesión</h1>
          <p class="login__texto">
            Sistema Integral de Administración de Equipos Modulares. Entra con tu cuenta
            institucional de Google.
          </p>

          <div id="google-domain-error" class="login__error hidden">
            ${icono('error')}
            <span id="google-domain-error-text"></span>
          </div>
          <div id="google-signin-button" class="login__google"></div>
          <div id="google-fallback" class="login__aviso hidden"></div>

          <dl class="login__dominios">
            <div><dt>Alumnos</dt><dd>@alumnos.udg.mx</dd></div>
            <div><dt>Asesores</dt><dd>@academicos.udg.mx</dd></div>
          </dl>
        </div>
        <footer class="login__pie">© Centro Universitario de Ciencias Exactas e Ingenierías</footer>
      </div>
    `;

    this.initGoogleButton();
  }

  private initGoogleButton() {
    const clientId =
      (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) || DEFAULT_GOOGLE_CLIENT_ID;
    const buttonContainer = document.getElementById('google-signin-button')!;
    const fallback = document.getElementById('google-fallback')!;

    if (!window.google) {
      fallback.textContent = 'No se pudo cargar Google. Verifica tu conexión y recarga la página.';
      fallback.classList.remove('hidden');
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => this.handleCredential(response.credential),
    });

    window.google.accounts.id.renderButton(buttonContainer, {
      type: 'standard',
      theme: document.documentElement.dataset.theme === 'dark' ? 'filled_black' : 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
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
