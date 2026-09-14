import { login } from '../services/auth.service.js';
import { getErrorMessage } from '../services/errorMessages.js';
import { showToast } from '../components/Toast.js';

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

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .login-input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .login-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .login-label {
          font-size: 12px;
          font-weight: 500;
          color: #5f6368;
          padding: 0 2px;
        }

        .login-link {
          font-size: 12px;
          font-weight: 500;
          color: #1a73e8;
          text-decoration: none;
          transition: color 0.2s;
        }
        .login-link:hover {
          color: #1557b0;
          text-decoration: underline;
        }

        .login-input-wrapper {
          position: relative;
        }

        .login-input {
          width: 100%;
          border-radius: 12px;
          border: 1px solid #d1d5db;
          background: transparent;
          padding: 12px 14px;
          font-size: 14px;
          color: #202124;
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none;
          box-sizing: border-box;
        }
        .login-input:focus {
          border-color: #1a73e8;
          box-shadow: 0 0 0 1.5px #1a73e8;
        }
        .login-input::placeholder {
          color: #9ca3af;
        }

        .login-input-icon {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
          display: flex;
          align-items: center;
          pointer-events: none;
        }

        .login-input-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 4px;
        }
        .login-input-toggle:hover {
          color: #5f6368;
        }

        .login-remember {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-top: 2px;
        }

        .login-checkbox {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 1px solid #d1d5db;
          accent-color: #1a73e8;
          cursor: pointer;
        }

        .login-remember-label {
          font-size: 12px;
          color: #5f6368;
          cursor: pointer;
          user-select: none;
        }

        .login-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 16px;
          flex-direction: row-reverse;
        }

        .login-btn-submit {
          background: #1a73e8;
          color: #ffffff;
          font-size: 14px;
          font-weight: 500;
          padding: 10px 24px;
          border-radius: 9999px;
          border: none;
          cursor: pointer;
          transition: background 0.15s, box-shadow 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 120px;
        }
        .login-btn-submit:hover {
          background: #1557b0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .login-btn-submit:active {
          background: #174ea6;
        }
        .login-btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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
          .login-actions {
            flex-direction: column;
            gap: 16px;
          }
          .login-btn-submit {
            width: 100%;
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
              <p class="login-card-subtitle">Ingresa tus credenciales institucionales de CUCEI para acceder a tu cuenta</p>
            </div>

            <form id="login-form" class="login-form" autocomplete="on">
              <div class="login-input-group">
                <label class="login-label" for="codigo_cucei">Código CUCEI</label>
                <div class="login-input-wrapper">
                  <input type="text" id="codigo_cucei" name="codigo_cucei" class="login-input" placeholder="Ej. 220000001" required>
                  <div class="login-input-icon">
                    <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"></path>
                    </svg>
                  </div>
                </div>
              </div>

              <div class="login-input-group">
                <div class="login-label-row">
                  <label class="login-label" for="password">Contraseña</label>
                  <a class="login-link" href="#olvide-contrasena">¿Olvidaste tu contraseña?</a>
                </div>
                <div class="login-input-wrapper">
                  <input type="password" id="password" name="password" class="login-input" style="padding-right: 40px;" placeholder="Ingresa tu contraseña" required>
                  <button type="button" id="togglePassword" class="login-input-toggle" aria-label="Mostrar u ocultar contraseña">
                    <svg id="eyeIcon" style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"></path>
                      <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"></path>
                    </svg>
                  </button>
                </div>
              </div>

              <div class="login-remember">
                <input type="checkbox" id="rememberMe" name="rememberMe" class="login-checkbox">
                <label for="rememberMe" class="login-remember-label">Recordar en este equipo</label>
              </div>

              <div class="login-actions">
                <button type="submit" id="btn-login" class="login-btn-submit">Siguiente</button>
                <a class="login-link" href="#crear-cuenta">¿Problemas para ingresar?</a>
              </div>
            </form>
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

    const form = document.getElementById('login-form') as HTMLFormElement;
    form.addEventListener('submit', (e) => this.handleLogin(e));

    const toggleBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const eyeIcon = document.getElementById('eyeIcon');

    if (toggleBtn && passwordInput && eyeIcon) {
      toggleBtn.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        
        if (isPassword) {
          eyeIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
          `;
        } else {
          eyeIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          `;
        }
      });
    }
  }

  private async handleLogin(e: Event) {
    e.preventDefault();
    const btn = document.getElementById('btn-login') as HTMLButtonElement;
    const codigoInput = document.getElementById('codigo_cucei') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    
    try {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></span> Iniciando...';
      
      const res = await login(codigoInput.value.trim(), passwordInput.value);
      localStorage.setItem('siae_token', res.token);
      localStorage.setItem('siae_user', JSON.stringify(res.user));
      const roleHomes: Record<string, string> = { mentor: '#/mentor', admin: '#/admin' };
      window.location.hash = roleHomes[res.user.rol] ?? '#/perfil';
    } catch (err: any) {
      showToast(getErrorMessage(err.code, err.status), { type: 'error' });
      btn.disabled = false;
      btn.textContent = 'Siguiente';
    }
  }
}