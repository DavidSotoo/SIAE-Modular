// Toast component
export type ToastType = 'success' | 'error' | 'info';
interface ToastOptions { type?: ToastType; title?: string; duration?: number; }
const ICONS: Record<ToastType, string> = { success: 'check_circle', error: 'error', info: 'info' };
export function showToast(message: string, options: ToastOptions = {}): void {
  const { type = 'info', title, duration = 4000 } = options;
  let container = document.getElementById('toast-container');
  if (!container) { container = document.createElement('div'); container.id = 'toast-container'; document.body.appendChild(container); }
  const toast = document.createElement('div');
  toast.className = 'toast toast--' + type;
  toast.setAttribute('role', 'alert');
  const titleHtml = title ? '<div class="toast__title">' + title + '</div>' : '';
  toast.innerHTML = '<span class="toast__icon material-symbols-outlined">' + ICONS[type] + '</span><div class="toast__body">' + titleHtml + '<div class="toast__msg">' + message + '</div></div>';
  container.appendChild(toast);
  setTimeout(() => { toast.style.animation = 'fadeOut 300ms ease forwards'; toast.addEventListener('animationend', () => toast.remove()); }, duration);
}