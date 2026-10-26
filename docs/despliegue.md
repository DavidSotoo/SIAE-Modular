# Despliegue gratuito (Vercel + Neon)

Guía para poner SIAE-Modular en la web sin costo. La aplicación queda repartida
en tres piezas:

| Pieza         | Dónde                                            | Plan gratuito                       |
| ------------- | ------------------------------------------------ | ----------------------------------- |
| Base de datos | Neon (Postgres serverless)                       | 1 GB por proyecto, 100 CU-horas/mes |
| Backend       | Vercel, proyecto con _Root Directory_ `backend`  | Funciones serverless                |
| Frontend      | Vercel, proyecto con _Root Directory_ `frontend` | Estático                            |

Son **dos proyectos de Vercel sobre el mismo repositorio**. Es el patrón de
monorepo que Vercel soporta de forma nativa, y es para lo que el código ya
estaba escrito: `CORS_ORIGINS` existe precisamente porque la API y el frontend
viven en orígenes distintos.

---

## 1. Base de datos en Neon

1. Entrar a [neon.tech](https://neon.tech) con la cuenta de GitHub y crear un
   proyecto Postgres.
2. Copiar la cadena de conexión **pooled** (la que incluye `-pooler` en el host).
   Es la que conviene en serverless, donde cada instancia abre su propio pool.
3. Cargar el esquema y los catálogos, en este orden:

```bash
export DATABASE_URL='postgresql://...-pooler...neon.tech/neondb?sslmode=require'

for f in database/migrations/0*.sql; do
  echo "--- $f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seeds/001_catalogs.sql
```

Las habilidades y las áreas de interés viven en `database/seeds/`, **no** en las
migraciones: `docker-compose.yml` solo monta `migrations/` como `initdb.d`, por
eso en local la siembra se corre aparte. Sin este último paso los selectores de
habilidades y áreas aparecen vacíos.

Comprobar que quedó bien:

```bash
psql "$DATABASE_URL" -c '\dt' -c 'SELECT COUNT(*) FROM skills;'
```

## 2. Backend en Vercel

Crear un proyecto nuevo importando el repositorio y poner **Root Directory** en
`backend`. El resto lo resuelve `backend/vercel.json`, que compila con `tsc` y
manda todas las rutas a la función de `backend/api/index.js`.

Variables de entorno del proyecto:

| Variable           | Valor                                                         |
| ------------------ | ------------------------------------------------------------- |
| `DATABASE_URL`     | la cadena _pooled_ de Neon                                    |
| `JWT_SECRET`       | uno nuevo, **no** el de local (`openssl rand -base64 32`)     |
| `CORS_ORIGINS`     | la URL del frontend, p. ej. `https://siae-modular.vercel.app` |
| `NODE_ENV`         | `production`                                                  |
| `ADMIN_EMAILS`     | correos de administrador, separados por coma                  |
| `GOOGLE_CLIENT_ID` | solo si no se usa el que ya trae el código por defecto        |

`CORS_ORIGINS` y `JWT_SECRET` son obligatorias: `app.ts` lanza un error al
arrancar si faltan en producción, a propósito, para que no haya un despliegue
silenciosamente inseguro.

Comprobación:

```bash
curl https://<backend>.vercel.app/health   # {"status":"ok"}
```

## 3. Frontend en Vercel

Otro proyecto sobre el mismo repositorio, con **Root Directory** en `frontend`.
Vercel detecta Vite solo.

| Variable       | Valor                              |
| -------------- | ---------------------------------- |
| `VITE_API_URL` | `https://<backend>.vercel.app/api` |

**Esta variable es de _build time_, no de ejecución.** `frontend/vite.config.ts`
la lee para meter el origen de la API en el `connect-src` de la Content Security
Policy. Si falta o está mal, el navegador bloqueará todas las llamadas a la API
y la aplicación cargará pero sin datos. Al cambiarla hay que **redesplegar**,
no basta con guardarla.

## 4. Google OAuth

En la consola de Google Cloud (proyecto `siae-modular`, cliente OAuth
"SIAE-Modular Web"), añadir la URL del frontend a **Orígenes de JavaScript
autorizados**:

```
https://<frontend>.vercel.app
```

Sin esto el botón de "Acceder con Google" falla en producción, aunque funcione
en local.

## 5. Prueba de extremo a extremo

1. Abrir el frontend y entrar con una cuenta `@alumnos.udg.mx`.
2. Completar el perfil (código CUCEI) la primera vez.
3. Crear un proyecto y subir un protocolo PDF.
4. Entrar con una cuenta `@academicos.udg.mx`, abrir el protocolo y validarlo.
5. Entrar con un correo de `ADMIN_EMAILS` y emitir el folio.

---

## Límites que conviene tener presentes

- **Subida máxima 4 MB.** Vercel corta los cuerpos de petición _y de respuesta_
  de sus funciones en 4,5 MB a nivel de infraestructura; no hay forma de
  subirlo. Por eso el límite de multer está en 4 MB. Si algún protocolo real lo
  supera, la salida sería Vercel Blob (1 GB gratis), que ya es otro servicio.
- **Arranque en frío.** Neon apaga el cómputo tras 5 minutos sin uso y las
  funciones de Vercel también duermen. La primera petición tras un rato de
  inactividad puede tardar unos segundos. Es lo normal en plan gratuito.
- **El límite por IP se relaja.** `express-rate-limit` guarda los contadores en
  memoria y en serverless cada instancia tiene la suya. Sigue frenando abuso
  básico, pero deja de ser un límite global exacto.
- **Los PDFs viven en la base.** Cuentan contra el 1 GB de Neon. A 4 MB por
  protocolo da de sobra para el uso previsto, pero no es almacenamiento
  ilimitado.
