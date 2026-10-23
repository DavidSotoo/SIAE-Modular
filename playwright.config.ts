// Pruebas de interfaz (e2e) con Playwright contra el stack real: frontend de
// Vite + backend de Express + Postgres. Playwright levanta sus propios
// servidores en puertos distintos a los de desarrollo (4100 y 5188), con un
// JWT_SECRET fijo para poder firmar sesiones sin pasar por Google.
import { defineConfig, devices } from '@playwright/test';
import { E2E } from './e2e/entorno.js';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  // Las pruebas comparten la base sembrada y algunas cambian su estado
  // (solicitud de asesoria aceptada, perfil completado), asi que corren en serie.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: E2E.frontendUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // Desde backend/, como en desarrollo: ahi vive tsx y ahi se guardan los
      // PDFs subidos. Las variables de aqui ganan sobre las de backend/.env.
      command: 'npx tsx src/index.ts',
      cwd: 'backend',
      url: `${E2E.backendUrl}/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        PORT: String(E2E.backendPort),
        DATABASE_URL: E2E.databaseUrl,
        JWT_SECRET: E2E.jwtSecret,
        CORS_ORIGINS: E2E.frontendUrl,
        // Desactiva el limitador de peticiones, igual que en las pruebas de backend.
        NODE_ENV: 'test',
      },
    },
    {
      command: `npm --prefix frontend run dev -- --port ${E2E.frontendPort} --strictPort`,
      url: E2E.frontendUrl,
      reuseExistingServer: false,
      timeout: 60_000,
      // Vite da prioridad a las variables ya presentes sobre las de frontend/.env.
      env: { VITE_API_URL: `${E2E.backendUrl}/api` },
    },
  ],
});
