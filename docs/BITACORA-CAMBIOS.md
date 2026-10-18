# Bitácora de cambios técnicos — SIAE-Modular

Registro de mejoras de ingeniería (calidad, seguridad, rendimiento, accesibilidad).
Para decisiones de producto y de arquitectura ver `docs/bitacora-decisiones.md`.

Cada entrada responde: qué se identificó, por qué importaba, qué alternativas se
evaluaron, qué se decidió y qué resultado se midió.

---

## 2026-10-12 — Auditoría inicial y corrección de seguridad crítica

**Rama:** `angel/seguridad-critica` (desde `main`)

### Qué se identificó

Una auditoría del repositorio completo encontró 2 hallazgos críticos, 8 altos,
8 medios y 5 bajos. Los dos críticos se corrigieron en esta rama:

1. **XSS almacenado entre usuarios.** El helper `escapeHtml` existía pero solo se
   usaba en 3 de 8 vistas. La biografía, la URL de portafolio, los nombres de
   habilidades y los mensajes de solicitud se insertaban crudos con `innerHTML`.
   Cualquier alumno podía además crear habilidades sin restricción
   (`POST /api/skills` no exige rol) que se renderizan en las páginas de los demás.
2. **JWT firmado con un secreto por defecto.** `googleAuth.service.ts` usaba
   `process.env.JWT_SECRET || 'secret'`. El middleware de verificación sí
   abortaba si faltaba la variable, pero el firmado no.

### Por qué era necesario

El JWT de sesión se guarda en `localStorage`, accesible desde JavaScript. Un XSS
almacenado permitía robar la sesión de cualquier usuario que abriera la página
afectada, incluidos mentor y administrador: es decir, escalada de privilegios y
toma de cuenta. El fallback del JWT significaba que un despliegue sin
`JWT_SECRET` emitiría tokens firmados con la cadena pública `"secret"`,
trivialmente falsificables.

**Verificado de forma reproducible antes de corregir:** se guardó
`<img src=x onerror=window.__XSS__=1>` en la biografía de un alumno y se abrió
"Buscar Equipo" con la sesión de otro. Resultado: `window.__XSS__ === 1`, es
decir, ejecución de código en la sesión ajena.

### Alternativas evaluadas

- **Sanitizar en el backend al guardar** (p. ej. DOMPurify del lado servidor).
  Descartada como medida principal: destruye el dato original, no protege lo ya
  almacenado y falla en cuanto un dato llegue por otra vía. El escapado en el
  punto de salida es la defensa correcta.
- **Migrar las vistas a `textContent` / `createElement`.** Más seguro por
  construcción, pero obligaba a reescribir ocho vistas completas y rompía el
  acuerdo de no tocar la lógica ya validada.
- **Elegida:** escapar en todos los puntos de interpolación, más un helper
  `safeUrl()` para `href`/`src`, porque escapar no basta ahí: `javascript:alert(1)`
  no contiene ningún carácter especial y se ejecutaría igual.

### Qué se decidió

| Hallazgo | Corrección |
|---|---|
| C1 XSS almacenado | `escapeHtml()` en los 21 puntos de interpolación de datos de usuario, en 7 archivos; nuevo `safeUrl()` para URL de portafolio y foto de perfil; iniciales del avatar movidas a un `data-attribute` en vez de interpolarse dentro del `onerror` |
| C2 JWT con fallback | Eliminado el fallback: el backend ahora falla al emitir tokens si `JWT_SECRET` no está configurado |
| A1 CORS abierto | `cors()` restringido por `CORS_ORIGINS`; obligatoria en producción, puertos locales de Vite por defecto en desarrollo |
| A3 Sin cabeceras | `helmet()` añadido; límite de 100 kb en el cuerpo JSON |
| A4 PDF sin verificar | Validación por cabecera real (`%PDF-`) además del `mimetype` declarado por el cliente |
| A6 Dependencias | `bcrypt` eliminado (código muerto desde el login con Google) y `npm audit fix` |
| — Build roto | `searchStudents` no seleccionaba `foto_url` pese a exigirlo el tipo: `tsc` del backend fallaba en `main` |

### Resultado medido

| Métrica | Antes | Después |
|---|---|---|
| XSS entre usuarios | **Ejecuta** (`window.__XSS__ === 1`) | **Neutralizado**: 0 elementos inyectados, la carga útil se muestra como texto |
| Vulnerabilidades backend | 2 críticas, 3 altas, 5 moderadas | **0 críticas, 0 altas**, 2 moderadas |
| Vulnerabilidades frontend | 3 altas, 1 moderada | 1 alta, 1 moderada |
| `tsc` backend | **Falla** (TS2322) | Limpio |
| Cabeceras de seguridad | Ninguna | CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy |
| CORS | Cualquier origen | Solo orígenes en lista blanca |
| Pruebas de API | 108/108 | **108/108** (sin regresión) |
| Bundle (gzip) | 21.88 kB | 21.97 kB (+0.09 kB) |

Los 7 invariantes de negocio se verificaron intactos con la suite de 108 pruebas
de API tras los cambios.

### Deuda que queda abierta

- **A2:** sin rate limiting en ningún endpoint, incluido el login.
- **A5:** parámetros de ruta sin validar; un `:id` no numérico produce HTTP 500
  en vez de 400 (verificado: error `22P02` de Postgres).
- **A7:** cero pruebas versionadas en el repositorio y sin CI. La suite de 108
  pruebas usada aquí vive fuera del repo.
- **Vite** mantiene una vulnerabilidad alta que solo se corrige con un salto de
  versión mayor. Solo afecta al servidor de desarrollo, no al bundle de producción.
- Los manejadores `onerror` en línea del avatar impedirán una CSP estricta sin
  `unsafe-inline`; conviene moverlos a listeners cuando se aborde la CSP.

---

## 2026-10-12 — Pruebas automatizadas, validación de entrada y CI

**Rama:** `angel/validacion-y-pruebas` (apilada sobre `angel/seguridad-critica`)

### Qué se identificó

1. **Sin red de seguridad (A7).** El repositorio no tenía ninguna prueba
   versionada ni framework de pruebas instalado, ni integración continua. El
   PR #5 afirmaba "94/94 pruebas de API", pero ese script nunca se commiteó:
   la afirmación no era reproducible por nadie del equipo.
2. **Entrada sin validar (A5).** Ningún endpoint validaba los parámetros de
   ruta. Un `:id_proyecto` no numérico se convertía en `NaN`, llegaba hasta
   Postgres y devolvía HTTP 500 con el error `22P02`, además de gastar una
   consulta por cada petición basura.

### Por qué era necesario

Sin pruebas, nada impedía que la siguiente mejora de diseño rompiera el motor
de estados sin que nadie se enterara: justamente el riesgo que corre un
proyecto con 5 etapas ya validadas y varias personas tocando el mismo código.
De hecho la auditoría encontró que `npm run build` del backend llevaba una
semana roto en `main` sin que nadie lo notara, porque no había CI que lo
ejecutara.

### Alternativas evaluadas

- **Pruebas contra un servidor levantado** (como el script externo original,
  que usaba `fetch` contra `localhost:4000`). Descartada: obliga a orquestar
  un servidor en CI y vuelve las pruebas sensibles a puertos y tiempos.
- **Elegida: Supertest montando la app en proceso.** No abre puerto y corre
  igual en local y en CI. Obligó a extraer la app a `src/app.ts` dejando
  `index.ts` solo como arranque, que además es la estructura habitual.
- **Base de datos:** se evaluó mockear `pg`. Descartado: las pruebas deben
  ejercitar las transacciones y los `SELECT ... FOR UPDATE` reales, que son
  justamente donde vivían los errores de IMF-05. Se usa Postgres de verdad y
  los datos se aíslan con el prefijo `99` en `codigo_cucei`.
- **Validación:** se evaluó validar a mano en cada controlador. Se eligió zod
  con un middleware reutilizable, dejando las reglas de negocio (20 palabras,
  100 palabras) en los servicios, donde ya estaban documentadas y probadas.

### Resultado medido

| Métrica | Antes | Después |
|---|---|---|
| Pruebas versionadas | **0** | **105** en 6 suites |
| Framework de pruebas | Ninguno | Vitest + Supertest |
| Integración continua | Ninguna | GitHub Actions (typecheck, pruebas, build) |
| `:id` no numérico | **HTTP 500** (`22P02` de Postgres) | **HTTP 400** `VALIDATION_ERROR` |
| Rutas con params validados | 0 de 13 | **13 de 13** |

Verificado además simulando el entorno de CI en local: base de datos creada
desde cero, las 7 migraciones aplicadas en orden sin errores, `npm ci` en
ambos paquetes y la suite completa en verde (105/105) contra esa base limpia.

### Deuda que queda abierta

- **A2 (rate limiting)** sigue pendiente; es lo siguiente en la lista.
- Sin ESLint, Prettier ni husky: el CI corre typecheck y pruebas, pero no
  estilo. Corresponde a la fase de calidad.
- Sin pruebas de frontend (unitarias ni e2e con Playwright).
- Las pruebas comparten una base de datos y corren en serie
  (`fileParallelism: false`). Es suficiente a esta escala, pero si la suite
  crece conviene una base por worker.
- `tsconfig.json` solo incluye `src`, así que `npm run typecheck` no cubre los
  archivos de prueba; los valida Vitest al ejecutarlos.
