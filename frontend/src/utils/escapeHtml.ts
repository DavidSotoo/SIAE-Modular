// Escapa texto capturado por usuarios (títulos, descripciones, etc.) antes de
// insertarlo con innerHTML, para que no se interprete como HTML/JS.
export function escapeHtml(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Devuelve la URL solo si usa un esquema seguro para navegar o cargar
 * recursos. Escapar no basta en `href`/`src`: `javascript:alert(1)` no lleva
 * ningun caracter especial y se ejecutaria igual al hacer clic.
 */
export function safeUrl(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw, window.location.origin);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.href;
  } catch {
    return null;
  }
}
