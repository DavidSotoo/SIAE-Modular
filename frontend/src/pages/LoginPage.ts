import { loginWithGoogle } from '../services/auth.service.js';
import { getErrorMessage } from '../services/errorMessages.js';
import { showToast } from '../components/Toast.js';

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
    this.container.innerHTML = `
      <style>
        .login-page-wrapper {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: #f0f4f9;
          background-image:
            radial-gradient(circle at 10% 20%, rgba(26, 115, 232, 0.035) 0%, transparent 40%),
            radial-gradient(circle at 90% 80%, rgba(11, 32, 70, 0.03) 0%, transparent 45%);
          font-family: 'Inter', 'Roboto', sans-serif;
          color: #202124;
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          z-index: 1000;
          overflow-y: auto;
        }

        .login-topbar {
          width: 100%;
          max-width: 1152px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
        }

        .login-topbar-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .login-topbar-text {
          display: flex;
          flex-direction: column;
        }

        .login-topbar-title {
          font-size: 14px;
          font-weight: 600;
          color: #0b2046;
          line-height: 1;
        }

        .login-topbar-subtitle {
          font-size: 10px;
          color: #5f6368;
          text-transform: uppercase;
          font-weight: 500;
          letter-spacing: 0.05em;
          margin-top: 2px;
        }

        .login-help-badge {
          font-size: 12px;
          font-weight: 500;
          color: #5f6368;
          text-decoration: none;
          padding: 6px 12px;
          border-radius: 9999px;
          transition: background 0.2s, color 0.2s;
        }
        .login-help-badge:hover {
          background: rgba(255,255,255,0.6);
          color: #1a73e8;
        }

        .login-main {
          flex-grow: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .login-card {
          width: 100%;
          max-width: 448px;
          background: #ffffff;
          border-radius: 24px;
          border: 1px solid rgba(229, 231, 235, 0.75);
          box-shadow: 0 4px 20px -2px rgba(17, 24, 39, 0.08), 0 2px 6px -1px rgba(17, 24, 39, 0.04);
          padding: 44px 40px;
        }

        .login-card-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .login-card-emblem {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }

        .login-card-title {
          font-size: 24px;
          font-weight: 400;
          color: #202124;
          margin-bottom: 8px;
          letter-spacing: -0.02em;
        }

        .login-card-subtitle {
          font-size: 14px;
          color: #5f6368;
          line-height: 1.6;
        }

        .login-google-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding-top: 8px;
        }

        #google-signin-button {
          min-height: 44px;
        }

        .login-google-fallback {
          font-size: 13px;
          color: #b3261e;
          text-align: center;
        }

        .login-domain-error {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 13px;
          color: #b3261e;
          background: #fce8e6;
          border: 1px solid #f6c6c2;
          border-radius: 12px;
          padding: 12px 14px;
          text-align: left;
          line-height: 1.4;
        }
        .login-domain-error .material-symbols-outlined {
          font-size: 18px;
          flex-shrink: 0;
        }
        .login-domain-error.hidden {
          display: none;
        }

        .login-domain-hint {
          font-size: 12px;
          color: #5f6368;
          text-align: center;
          line-height: 1.6;
        }

        .login-footer {
          width: 100%;
          max-width: 1152px;
          margin: 0 auto;
          padding: 16px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .login-footer-select {
          background: transparent;
          border: none;
          font-size: 12px;
          color: #5f6368;
          cursor: pointer;
          outline: none;
        }

        .login-footer-links {
          display: flex;
          align-items: center;
          gap: 24px;
          font-size: 12px;
          color: #5f6368;
        }
        .login-footer-links a {
          color: #5f6368;
          text-decoration: none;
          transition: color 0.2s;
        }
        .login-footer-links a:hover {
          color: #202124;
        }
        .login-footer-copy {
          color: #9ca3af;
          font-size: 11px;
        }

        @media (max-width: 640px) {
          .login-card {
            padding: 36px 28px;
          }
          .login-footer {
            flex-direction: column;
            gap: 16px;
          }
        }
      </style>

      <div class="login-page-wrapper">
        <!-- BEGIN: TopBar -->
        <header class="login-topbar">
          <div class="login-topbar-left">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDjYcY0-KnrFkJGFrASeaIVzbyuai9lTwsAh9dOV0y3MrYSq-MbSMS6By2cbZM8bByAwJ1VqwpWYYVks4r31ID6B9HfgEzh6olPIZMSR9sqjOQ3qGfO303FosaDBc6Z6aXT0e8zKlmJvYPg1DYkoJaaXxb02eWkTiz5g8aT7HtA0vGMneDTIM6IX8pmtbHyI8poTCg8H905QOQa1EOXb5syg89D8EXRtyda_gQwYXph-Np7Jp1PHGUPEQ_ssfSslrEyHA" alt="Logo UdeG" style="height: 32px; width: auto; object-fit: contain;">
            <div class="login-topbar-text">
              <span class="login-topbar-title">CUCEI</span>
              <span class="login-topbar-subtitle">Universidad de Guadalajara</span>
            </div>
          </div>
          <a class="login-help-badge" href="#ayuda">Ayuda y soporte</a>
        </header>

        <!-- BEGIN: MainContent -->
        <main class="login-main">
          <div class="login-card">
            <div class="login-card-header">
              <div class="login-card-emblem">
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAr3jCUlsUzPBOGY1J8x9c6xyq81SFu7Rb4tOzGz1H_ybkPh1Oqaqq1Cv_pLcYW1kpFXaZ98dVTtZ-7ZC3tMCtvPkHQBympN3fwZssmI4I6qx4Clua0HqOrBlO7ZjKAldMxyjsIOlOfLlD5Vkrd6uj96MAXENOvUS6_bdhlAPkNECUZgVNoP0RmRBuX8CXSlPKR6IYQfD68SMefDsRenbeo68VEAAl39s8GaWST89jFkJg5YfiSSLltgFwgfXoQmt-Ouw" alt="Escudo Universidad de Guadalajara" style="height: 64px; width: auto; object-fit: contain;">
              </div>
              <h1 class="login-card-title">Iniciar sesión</h1>
              <p class="login-card-subtitle">Entra con tu cuenta institucional de Google para acceder a tu cuenta</p>
            </div>

            <div class="login-google-area">
              <div id="google-domain-error" class="login-domain-error hidden">
                <span class="material-symbols-outlined">error</span>
                <span id="google-domain-error-text"></span>
              </div>
              <div id="google-signin-button"></div>
              <div id="google-fallback" class="login-google-fallback hidden"></div>
              <p class="login-domain-hint">
                Alumnos: cuenta <strong>@alumnos.udg.mx</strong> · Mentores: cuenta <strong>@academicos.udg.mx</strong>
              </p>
            </div>
          </div>
        </main>

        <!-- BEGIN: Footer -->
        <footer class="login-footer">
          <select aria-label="Seleccionar idioma" class="login-footer-select">
            <option selected value="es">Español (México)</option>
            <option value="en">English (United States)</option>
          </select>
          <div class="login-footer-links">
            <a href="#ayuda">Ayuda</a>
            <a href="#privacidad">Privacidad</a>
            <a href="#condiciones">Términos</a>
            <span class="login-footer-copy">© CUCEI Universidad de Guadalajara</span>
          </div>
        </footer>
      </div>
    `;

    this.initGoogleButton();
  }

  private initGoogleButton() {
    const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) || DEFAULT_GOOGLE_CLIENT_ID;
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
    } catch (err: any) {
      const message = getErrorMessage(err.code, err.status);
      if (err.code === 'DOMAIN_NOT_ALLOWED') {
        domainErrorText.textContent = message;
        domainError.classList.remove('hidden');
      } else {
        showToast(message, { type: 'error' });
      }
    }
  }
}
