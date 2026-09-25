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
