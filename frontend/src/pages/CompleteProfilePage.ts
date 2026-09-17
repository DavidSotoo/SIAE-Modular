import { completeProfile } from '../services/auth.service.js';
import { getErrorMessage } from '../services/errorMessages.js';
import { showToast } from '../components/Toast.js';

export class CompleteProfilePage {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  render() {
    this.container.innerHTML = `
      <div class="section-header">
        <h2>Completa tu perfil</h2>
        <p>Es la primera vez que inicias sesión. Ingresa tu código CUCEI (el mismo que usas en SIIAU) para continuar.</p>
      </div>
      <div class="card card--md" style="max-width: 420px;">
        <form id="complete-profile-form">
          <div class="form-group">
            <label class="form-label" for="codigo_cucei">Código CUCEI</label>
            <input type="text" id="codigo_cucei" name="codigo_cucei" class="form-control" placeholder="Ej. 220000001" inputmode="numeric" maxlength="9" required>
            <div id="codigo-error" class="form-error hidden"></div>
          </div>
          <div class="mt-4 flex justify-end">
            <button type="submit" class="btn btn--primary" id="btn-complete">Continuar</button>
          </div>
        </form>
      </div>
    `;

    const form = document.getElementById('complete-profile-form') as HTMLFormElement;
    form.addEventListener('submit', (e) => this.handleSubmit(e));
  }

  private async handleSubmit(e: Event) {
    e.preventDefault();
    const input = document.getElementById('codigo_cucei') as HTMLInputElement;
    const btn = document.getElementById('btn-complete') as HTMLButtonElement;
    const errorDiv = document.getElementById('codigo-error')!;

    const codigo = input.value.trim();
    input.classList.remove('is-invalid');
    errorDiv.classList.add('hidden');

    if (!/^\d{9}$/.test(codigo)) {
      input.classList.add('is-invalid');
      errorDiv.textContent = 'El código debe tener exactamente 9 dígitos';
      errorDiv.classList.remove('hidden');
      return;
    }

    try {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Guardando...';

      await completeProfile(codigo);

      const rawUser = localStorage.getItem('siae_user');
      if (rawUser) {
        const user = JSON.parse(rawUser);
        user.codigo_cucei = codigo;
        localStorage.setItem('siae_user', JSON.stringify(user));
      }

      showToast('Perfil completado', { type: 'success' });
      window.location.hash = '#/perfil';
    } catch (err: any) {
      showToast(getErrorMessage(err.code, err.status), { type: 'error' });
      btn.disabled = false;
      btn.textContent = 'Continuar';
    }
  }
}
