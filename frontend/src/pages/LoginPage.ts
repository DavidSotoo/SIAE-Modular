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
      <div style="max-width: 400px; margin: 4rem auto;">
        <div class="card card--lg">
          <div class="text-center mb-6">
            <h2 class="text-title">Iniciar Sesión</h2>
            <p class="text-muted">Ingresa tus credenciales de CUCEI</p>
          </div>
          <form id="login-form">
            <div class="form-group">
              <label class="form-label" for="codigo_cucei">Código CUCEI</label>
              <input type="text" id="codigo_cucei" name="codigo_cucei" class="form-control" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="password">Contraseña</label>
              <input type="password" id="password" name="password" class="form-control" required>
            </div>
            <div class="mt-6">
              <button type="submit" class="btn btn--primary btn--full" id="btn-login">Entrar</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const form = document.getElementById('login-form') as HTMLFormElement;
    form.addEventListener('submit', (e) => this.handleLogin(e));
  }

  private async handleLogin(e: Event) {
    e.preventDefault();
    const btn = document.getElementById('btn-login') as HTMLButtonElement;
    const codigoInput = document.getElementById('codigo_cucei') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    
    try {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Iniciando sesión...';
      
      const res = await login(codigoInput.value.trim(), passwordInput.value);
      localStorage.setItem('siae_token', res.token);
      localStorage.setItem('siae_user', JSON.stringify(res.user));
      window.location.hash = '#/perfil';
    } catch (err: any) {
      showToast(getErrorMessage(err.code, err.status), { type: 'error' });
      btn.disabled = false;
      btn.textContent = 'Entrar';
    }
  }
}