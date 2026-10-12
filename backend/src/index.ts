import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { AppError } from './utils/errors.js';

import catalogRoutes      from './routes/catalog.routes.js';
import studentRoutes      from './routes/student.routes.js';
import teamRequestRoutes  from './routes/teamRequest.routes.js';
import advisorRoutes      from './routes/advisor.routes.js';
import advisorRequestRoutes from './routes/advisorRequest.routes.js';
import projectRoutes      from './routes/project.routes.js';
import authRoutes         from './routes/auth.routes.js';
import adminRoutes        from './routes/admin.routes.js';

const app = express();

// ─── Middlewares globales ─────────────────────────────────────────────────
app.use(helmet());

// Origenes permitidos. En desarrollo basta con los puertos locales de Vite;
// en produccion CORS_ORIGINS debe traer la URL real (separadas por coma).
const DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:5188', 'http://localhost:5199'];
const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CORS_ORIGINS es obligatorio en produccion');
  }
  allowedOrigins.push(...DEV_ORIGINS);
}

app.use(
  cors({
    origin: (origin, cb) => {
      // Sin cabecera Origin (curl, health checks, apps nativas) no es una
      // peticion de navegador sujeta a CORS: no hay sesion que proteger.
      if (!origin) return cb(null, true);
      cb(null, allowedOrigins.includes(origin));
    },
  }),
);

app.use(express.json({ limit: '100kb' }));

// ─── Rutas ───────────────────────────────────────────────────────────────
app.use('/api', authRoutes);
app.use('/api', catalogRoutes);
app.use('/api', studentRoutes);
app.use('/api', teamRequestRoutes);
app.use('/api', advisorRoutes);
app.use('/api', advisorRequestRoutes);
app.use('/api', projectRoutes);
app.use('/api', adminRoutes);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ─── Manejador global de errores ─────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res
      .status(err.statusCode)
      .json({ error: err.message, code: err.code });
  }
  console.error('[Unhandled error]', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ─── Arranque ────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? '4000', 10);
app.listen(PORT, () => {
  console.log(`SIAE-Modular backend corriendo en http://localhost:${PORT}`);
});

export default app;
