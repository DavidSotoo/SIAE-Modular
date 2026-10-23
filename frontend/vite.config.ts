// Configuracion de Vite. Su unico trabajo hoy es inyectar la Content Security
// Policy en index.html, tanto en desarrollo como en el build, para que lo que
// se prueba en local (incluidas las pruebas e2e) sea lo que llega a produccion.
import { defineConfig, loadEnv, type Plugin } from 'vite';

/**
 * CSP estricta para scripts: solo los del propio origen y el cliente de Google
 * Identity. Sin 'unsafe-inline' en script-src, un HTML inyectado (XSS) no puede
 * ejecutar ni <script> ni manejadores como onerror="...".
 *
 * style-src conserva 'unsafe-inline': las vistas usan atributos style= y Vite
 * inyecta el CSS como <style> en desarrollo. El riesgo de estilos en linea es
 * mucho menor que el de scripts.
 */
function construirCsp(apiUrl: string | undefined, desarrollo: boolean): string {
  // Si la API vive en otro origen (en desarrollo, localhost:4000), hay que
  // permitirlo; si es una ruta relativa, ya la cubre 'self'.
  const origenApi = apiUrl && /^https?:\/\//.test(apiUrl) ? new URL(apiUrl).origin : '';
  const google = 'https://accounts.google.com/gsi/';

  const directivas: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", `${google}client`],
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', `${google}style`],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    // Fotos de perfil de Google y logotipos alojados en googleusercontent.
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
