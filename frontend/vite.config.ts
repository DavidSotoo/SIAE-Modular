// Configuracion de Vite. Su unico trabajo hoy es inyectar la Content Security
// Policy en index.html, tanto en desarrollo como en el build, para que lo que
// se prueba en local (incluidas las pruebas e2e) sea lo que llega a produccion.
import { defineConfig, loadEnv, type Plugin } from 'vite';

/**
 * CSP estricta para scripts: solo los del propio origen y el cliente de Google
 * Identity. Sin 'unsafe-inline' en script-src, un HTML inyectado (XSS) no puede
 * ejecutar ni <script> ni manejadores como onerror="...".
 *
 * Estilos: en produccion solo hojas del propio origen (el build saca el CSS a
 * un archivo) y la de Google Identity; ni <style> ni atributos style=. En
 * desarrollo Vite inyecta el CSS como <style>, asi que ahi se permiten esos
 * elementos (style-src-elem) pero los atributos siguen prohibidos
 * (style-src-attr 'none'): las pruebas e2e, que corren contra el servidor de
 * desarrollo, fallan si una vista vuelve a usar style=.
 */
function construirCsp(apiUrl: string | undefined, desarrollo: boolean): string {
  // Si la API vive en otro origen (en desarrollo, localhost:4000), hay que
  // permitirlo; si es una ruta relativa, ya la cubre 'self'.
  const origenApi = apiUrl && /^https?:\/\//.test(apiUrl) ? new URL(apiUrl).origin : '';
  const google = 'https://accounts.google.com/gsi/';

  const directivas: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", `${google}client`],
    'style-src': ["'self'", `${google}style`],
    'style-src-elem': ["'self'", `${google}style`, desarrollo ? "'unsafe-inline'" : ''],
    // El boton de Google pone un style= fijo con su ancho; se permite solo ese
    // valor exacto por su hash. Si Google lo cambia, el boton sigue funcionando
    // y solo pierde ese ancho. Cualquier otro style= queda bloqueado.
    'style-src-attr': [
      "'unsafe-hashes'",
      "'sha256-0XbXxDziHuSSx+6TUE+FAaDsbSyh3wmRLaFKB5hZFbI='", // width:320px; max-width:400px; min-width:min-content;
    ],
    // Las fuentes se sirven desde el propio sitio (@fontsource).
    'font-src': ["'self'"],
    // Fotos de perfil de las cuentas de Google.
    'img-src': ["'self'", 'data:', 'https://*.googleusercontent.com'],
    // En desarrollo, el websocket de recarga en caliente de Vite.
    'connect-src': ["'self'", google, origenApi, desarrollo ? 'ws:' : ''],
    'frame-src': [google],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  };

  return Object.entries(directivas)
    .map(([nombre, fuentes]) => [nombre, ...fuentes.filter(Boolean)].join(' '))
    .join('; ');
}

function cspPlugin(apiUrl: string | undefined): Plugin {
  return {
    name: 'siae-csp',
    transformIndexHtml(_html, ctx) {
      return [
        {
          tag: 'meta',
          attrs: {
            'http-equiv': 'Content-Security-Policy',
            content: construirCsp(apiUrl, Boolean(ctx.server)),
          },
          // Antes que cualquier <script> o <link>, para que ya aplique a ellos.
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}

export default defineConfig(({ mode }) => {
  // Las variables del entorno del proceso ganan sobre frontend/.env (asi las
  // fijan las pruebas e2e), igual que en el resto de Vite.
  const env = { ...loadEnv(mode, process.cwd()), ...process.env };
  return {
    plugins: [cspPlugin(env.VITE_API_URL)],
  };
});
