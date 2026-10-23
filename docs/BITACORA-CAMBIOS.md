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

| Hallazgo             | Corrección                                                                                                                                                                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1 XSS almacenado    | `escapeHtml()` en los 21 puntos de interpolación de datos de usuario, en 7 archivos; nuevo `safeUrl()` para URL de portafolio y foto de perfil; iniciales del avatar movidas a un `data-attribute` en vez de interpolarse dentro del `onerror` |
| C2 JWT con fallback  | Eliminado el fallback: el backend ahora falla al emitir tokens si `JWT_SECRET` no está configurado                                                                                                                                             |
| A1 CORS abierto      | `cors()` restringido por `CORS_ORIGINS`; obligatoria en producción, puertos locales de Vite por defecto en desarrollo                                                                                                                          |
| A3 Sin cabeceras     | `helmet()` añadido; límite de 100 kb en el cuerpo JSON                                                                                                                                                                                         |
| A4 PDF sin verificar | Validación por cabecera real (`%PDF-`) además del `mimetype` declarado por el cliente                                                                                                                                                          |
| A6 Dependencias      | `bcrypt` eliminado (código muerto desde el login con Google) y `npm audit fix`                                                                                                                                                                 |
| — Build roto         | `searchStudents` no seleccionaba `foto_url` pese a exigirlo el tipo: `tsc` del backend fallaba en `main`                                                                                                                                       |

### Resultado medido

| Métrica                   | Antes                                | Después                                                                       |
| ------------------------- | ------------------------------------ | ----------------------------------------------------------------------------- |
| XSS entre usuarios        | **Ejecuta** (`window.__XSS__ === 1`) | **Neutralizado**: 0 elementos inyectados, la carga útil se muestra como texto |
| Vulnerabilidades backend  | 2 críticas, 3 altas, 5 moderadas     | **0 críticas, 0 altas**, 2 moderadas                                          |
| Vulnerabilidades frontend | 3 altas, 1 moderada                  | 1 alta, 1 moderada                                                            |
| `tsc` backend             | **Falla** (TS2322)                   | Limpio                                                                        |
| Cabeceras de seguridad    | Ninguna                              | CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy                          |
| CORS                      | Cualquier origen                     | Solo orígenes en lista blanca                                                 |
| Pruebas de API            | 108/108                              | **108/108** (sin regresión)                                                   |
| Bundle (gzip)             | 21.88 kB                             | 21.97 kB (+0.09 kB)                                                           |

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

| Métrica                    | Antes                              | Después                                    |
| -------------------------- | ---------------------------------- | ------------------------------------------ |
| Pruebas versionadas        | **0**                              | **105** en 6 suites                        |
| Framework de pruebas       | Ninguno                            | Vitest + Supertest                         |
| Integración continua       | Ninguna                            | GitHub Actions (typecheck, pruebas, build) |
| `:id` no numérico          | **HTTP 500** (`22P02` de Postgres) | **HTTP 400** `VALIDATION_ERROR`            |
| Rutas con params validados | 0 de 13                            | **13 de 13**                               |

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

---

## 2026-10-17 — Límite de peticiones y herramientas de calidad

**Rama:** `angel/rate-limiting-y-calidad` (apilada sobre `angel/validacion-y-pruebas`)

### Qué se identificó

1. **Sin límite de peticiones (A2).** Ningún endpoint lo tenía, incluido
   `/auth/google`, que es el más caro de abusar porque verifica cada token
   contra un servicio externo de Google.
2. **Sin linter ni formateador.** El estilo dependía de cada persona y los
   errores tontos (imports sin usar, `==` en vez de `===`) solo se detectaban
   leyendo el diff a mano. Tampoco había nada que los frenara antes de un
   commit.

### Alternativas evaluadas

- **Limitador y pruebas.** El limitador rompería la suite, que lanza cientos
  de peticiones desde la misma IP. Se evaluó subir los topes en el entorno de
  prueba, pero eso deja el comportamiento real sin cubrir. Se optó por
  desactivarlo bajo `NODE_ENV=test` y cubrirlo aparte montando una app mínima
  con un tope bajo, que es determinista y no depende de temporizadores.
- **`trust proxy`.** Confiar en todos los saltos es lo más sencillo, pero
  permite falsificar `X-Forwarded-For` y esquivar el límite. Se confía en
  exactamente uno, que es el proxy de Vercel.
- **Adopción de Prettier.** Se evaluó reformatear el repositorio completo de
  una vez, lo que da una base limpia pero genera un diff enorme y conflictos
  con las ramas que el equipo tenga abiertas. Se eligió la adopción gradual
  por archivo al tocarlo, vía lint-staged.
- **Hook de pre-commit.** Husky propone `npm test` por defecto. Se descartó:
  sería lento y exigiría Postgres levantado para poder commitear. Se usa
  lint-staged, y la suite completa queda en CI.

### Resultado medido

| Métrica              | Antes   | Después                                       |
| -------------------- | ------- | --------------------------------------------- |
| Endpoints con límite | 0       | API completa (300/15 min) y login (20/15 min) |
| Linter / formateador | Ninguno | ESLint 9 + Prettier                           |
| Errores de ESLint    | 12      | **0** (37 avisos por `any` heredados)         |
| Hook de pre-commit   | Ninguno | lint-staged (verificado que bloquea)          |
| Jobs de CI           | 2       | 3 (se añade lint)                             |
| Pruebas              | 105     | **109**                                       |

Verificado en ejecución real: 25 intentos de login seguidos dan 20 respuestas
y luego 429, con `Retry-After` y cabeceras `RateLimit`. El hook se probó
commiteando a propósito un archivo con `==` y una variable sin usar: lo
rechazó.

### Deuda que queda abierta

- Los 37 `any` siguen ahí, como avisos. El job de lint usa
  `--max-warnings 50`: conviene bajar ese número a medida que se limpien.
- El límite se guarda en memoria del proceso. Con varias instancias en Vercel
  cada una llevaría su propio contador; si eso importa, habría que moverlo a
  un almacén compartido.
- No hay `format:check` en CI, porque el repositorio aún no está formateado
  por completo y fallaría en los archivos heredados.
- Los commits que tocan un archivo por primera vez lo reformatean entero, así
  que conviene revisarlos ignorando espacios en blanco.

---

## 2026-10-17 — Diseño y experiencia (Fase 1)

**Rama:** `angel/diseno-y-experiencia` (apilada sobre `angel/rate-limiting-y-calidad`)

### Qué se identificó

1. **La aplicación era inusable en móvil.** La media query ocultaba el menú
   con `display: none`, pero `main.ts` le ponía `display: block` en línea, que
   gana sobre la hoja de estilos. A 375px quedaba un menú fijo de 256px
   tapando el contenido, sin forma de cerrarlo ni de navegar.
2. **Las vistas mostraban códigos crudos del motor de estados** ("pendiente",
   "correccion") y el historial decía "Cambio de N/A a pendiente".
3. **Solo Perfil tenía siluetas de carga**; el resto usaba un spinner con
   texto, que no reserva espacio y hace saltar el layout.
4. **Las tablas no cabían en móvil**: 4 y 6 columnas con `nowrap` dejaban un
   scroll horizontal con casi todo fuera de vista.
5. **Los formularios solo avisaban al enviar.**
6. Faltaban por completo `prefers-reduced-motion`, `:focus-visible` y
   skip-link, y los z-index eran números sueltos repartidos por el archivo.

### Alternativas evaluadas

- **Menú en móvil.** Se evaluó dejarlo oculto y mover la navegación a una
  barra inferior. Se eligió el cajón lateral porque conserva la misma
  estructura y el mismo código en ambos tamaños, sin duplicar la navegación.
- **Tablas en móvil.** Dejar el scroll horizontal es lo más barato, pero
  esconde columnas. Se eligió apilar cada fila como tarjeta con `data-label`,
  ocultando el `thead` solo visualmente para no perder la semántica de tabla.
- **Validación inline.** Validar en cada pulsación regaña por un campo que
  apenas se empezó a llenar. Se muestra el error al salir del campo y, a
  partir de ahí, se actualiza en vivo.
- **Bloqueo del botón.** La primera versión dejaba que cada campo tocara el
  botón por su cuenta; se detectó al probar que el último en evaluarse lo
  habilitaba aunque otro siguiera mal. Se añadió un coordinador.

### Resultado medido

| Métrica                       | Antes                        | Después                           |
| ----------------------------- | ---------------------------- | --------------------------------- |
| Navegación en móvil           | **Imposible** (menú tapando) | Cajón con 3 formas de cierre      |
| Scroll horizontal a 375px     | Sí, en las tablas            | **No** (medido con `scrollWidth`) |
| Vistas con skeleton           | 1 de 6                       | **6 de 6**                        |
| Etiquetas de estado           | Código crudo                 | Legibles, con icono y explicación |
| `prefers-reduced-motion`      | 0                            | 1                                 |
| Reglas `:focus-visible`       | 0                            | Global                            |
| Formularios con aviso en vivo | 0                            | 3 (onboarding, perfil, proyecto)  |

### Bugs encontrados al probar

- **Buscar Equipo dejaba una rejilla vacía sin explicación.** La comprobación
  de "sin resultados" miraba el total devuelto por la API, pero el renderizado
  descarta después al propio usuario; si el único resultado eras tú, no
  entraba al estado vacío. Ahora se filtra primero y el mensaje distingue los
  dos casos.

### Deuda que queda abierta

- **i18n sin resolver**: los textos siguen incrustados en las vistas. Falta
  decidir si se centraliza solo es-MX o si en-US entra en el alcance.
- Los `onerror` en línea del avatar siguen impidiendo una CSP estricta.
- Sin pruebas de interfaz: todo lo anterior se verificó a mano en el
  navegador. Playwright sigue pendiente.

---

## 2026-10-18 — Accesibilidad (Fase 2), primera parte

**Rama:** `angel/accesibilidad` (desde `main`)

### Qué se identificó

Se midió el estado con **axe-core 4.10.2** (el verificador estándar de WCAG)
en todas las vistas, más pruebas manuales de teclado que axe no cubre.
Resultado de la línea base:

| Vista                                       | Violaciones axe                             | Gravedad               |
| ------------------------------------------- | ------------------------------------------- | ---------------------- |
| Login                                       | 3 (landmarks)                               | moderate               |
| Alumno (perfil, equipo, asesores, proyecto) | 1 `region` c/u                              | moderate               |
| Admin / Mentor                              | `region` + `scrollable-region-focusable`    | moderate + **serious** |
| Modal (prueba manual de teclado)            | foco no entra, sin trampa, Escape no cierra | —                      |

### Por qué importaba

- **El modal era una trampa para quien usa teclado o lector de pantalla:** al
  abrirlo el foco se quedaba detrás, se podía tabular hacia el contenido de
  fondo (que debería estar inerte) y no había forma de cerrarlo con Escape.
- La **tabla con scroll** (serious) no se podía alcanzar con teclado: quien no
  usa mouse no podía desplazarla.
- Los **landmarks** mal puestos desorientan a un lector de pantalla, que los
  usa como índice para saltar entre secciones de la página.

### Qué se hizo

- **Modal (`Modal.ts`):** al abrir, el foco entra al diálogo y se recuerda
  quién lo tenía; Tab y Shift+Tab circulan dentro (trampa de foco); Escape lo
  cierra; al cerrar, el foco vuelve al elemento que lo abrió.
- **`scrollable-region-focusable`:** las tablas de admin y mentor reciben
  `tabindex="0"`, `role="region"` y `aria-label`, para ser alcanzables por
  teclado y anunciadas.
- **`region`:** el contenedor del sidebar pasa a ser el landmark de navegación
  (`role="navigation"` + `aria-label`), para que el logo y el pie (tema,
  cerrar sesión) dejen de quedar sueltos fuera de todo landmark. El menú
  interno deja de ser `<nav>` para no anidar dos landmarks de navegación.
- **Landmarks del login:** el login metía un `<main>` dentro del `<main>` del
  layout. El interno pasa a `<div>`; queda un solo main.

### Resultado medido

|                   | Antes                  | Después                                   |
| ----------------- | ---------------------- | ----------------------------------------- |
| Login             | 3 violaciones          | **0**                                     |
| Alumno (×4)       | 1 c/u                  | **0**                                     |
| Admin / Mentor    | 2 c/u (1 serious)      | **0**                                     |
| Modal con teclado | foco fuera, sin Escape | foco entra, trampa, Escape, foco devuelto |

Verificado con axe-core en las 7 vistas (todas en 0) y con pruebas manuales
de teclado sobre el modal. Las 109 pruebas de backend siguen pasando (no se
tocó backend).

### Verificación con Lighthouse

Se corrió **Lighthouse** (categoría accesibilidad) sobre las 5 vistas
principales, con Chrome real; las autenticadas se midieron sembrando la
sesión con Puppeteer antes de auditar.

| Vista                | Lighthouse a11y |
| -------------------- | --------------- |
| Login                | 100/100         |
| Perfil (alumno)      | 100/100         |
| Mi Proyecto (alumno) | 100/100         |
| Panel admin          | 100/100         |
| Panel asesor         | 100/100         |

**Matiz importante y honesto:** Lighthouse daba **100/100 también antes** de
estos cambios. Su puntaje usa un subconjunto curado de reglas de axe, más
laxo que el verificador completo; las violaciones que sí detectó axe
(landmarks, tabla no alcanzable por teclado) no entran en el número de
Lighthouse. Es decir: **el 100 de Lighthouse confirma que se cumple ese
umbral, pero la mejora real de esta fase se ve en axe (de hasta 3
violaciones por vista a 0) y en la navegación por teclado del modal, que
ninguna de las dos herramientas detecta de forma automática.** Para el
informe conviene citar las tres evidencias, no solo el 100.

### Cierre: toasts anunciados y contraste en modo oscuro

- **Toasts:** el contenedor `#toast-container` pasa a ser una región live
  persistente (`aria-live="polite"`), que existe desde el arranque — así el
  lector de pantalla anuncia de forma fiable los avisos insertados, cosa que
  un `role` en un nodo recién creado no siempre logra. Los errores conservan
  `role="alert"` (interrumpen); los avisos normales los anuncia el contenedor
  sin duplicar la lectura. Verificado en el DOM.
- **Contraste en modo oscuro:** se corrió axe con la regla `color-contrast`
  forzando el tema oscuro, en las vistas de alumno y en el panel admin
  (incluidas las insignias de estado de colores). **0 fallos.**

Con esto la Fase 2 queda cerrada.

---

## 2026-10-22 — Pruebas de interfaz (e2e) con Playwright y axe

### Qué se identificó

El frontend no tenía ninguna prueba. Todo lo logrado en las fases de diseño
y accesibilidad se había verificado a mano en el navegador, así que una
regresión (un modal que pierde el foco, una vista que vuelve a tener
violaciones de axe) podía llegar a `main` sin que nadie lo notara.

### Alternativas evaluadas

- **Simular la API con `page.route`.** Más rápido y sin base de datos, pero
  prueba un backend imaginario: no detectaría que el frontend y la API dejen
  de entenderse, que es justo el tipo de fallo que más cuesta ver a mano.
- **Elegida: stack real.** Playwright levanta su propio backend (puerto 4100)
  y su propio Vite (5188) contra Postgres, con un `JWT_SECRET` fijo. La
  siembra crea usuarios con código `98…` y nombre `E2E-` (aislados de los
  datos reales y de las pruebas de backend, que usan `99…`) y firma un JWT por
  usuario, que se inyecta en `localStorage` igual que lo haría el login con
  Google. El botón de Google se bloquea en las pruebas para no depender de la red.

### Qué cubre (29 pruebas, `npm run test:e2e`)

- **Accesibilidad:** axe (WCAG 2.1 A/AA + buenas prácticas) en las 8 vistas,
  en tema claro y oscuro. Exige cero violaciones.
- **Navegación por rol:** redirección al login sin sesión, página de inicio de
  cada rol, rutas prohibidas, menú lateral por rol, ruta inexistente, cerrar
  sesión y el onboarding completo (capturar el código CUCEI).
- **Flujo entre roles:** la alumna solicita asesoría desde el modal, el mentor
  la ve y la acepta, y la alumna ya no puede pedir otro asesor. Incluye el
  modal manejado solo con teclado (foco inicial, trampa de Tab, Escape y foco
  devuelto).

Corre en CI como un job nuevo, `E2E (Playwright + axe)`, que sube el reporte
y las trazas si algo falla. Se corrió 4 veces seguidas en local sin fallos
intermitentes.

### Bugs que encontraron las pruebas

1. **El modal no ponía el foco en el primer campo** (lo prometía la Fase 2).
   `'.modal__body ' + FOCUSABLE` solo aplicaba el prefijo al primer selector de
   la lista separada por comas, así que `button:not([disabled])` encontraba
   antes la ✕ del encabezado. Se busca ahora dentro de `bodyEl`.
2. **El botón de tema incumplía WCAG 2.5.3** (`label-content-name-mismatch`):
   se veía "Modo claro" pero su nombre accesible era "Cambiar tema", así que
   no se podía activar por voz diciendo lo que se ve. Ahora es
   "Modo claro, cambiar tema" y se actualiza al alternar.
3. **Completar perfil no tenía `h1`** (`page-has-heading-one`): es la única vista
   sin menú lateral, que es donde vive el `h1` "SIAE".

Las tres se habían escapado de la verificación manual de la Fase 2, que usaba
un subconjunto de reglas de axe y probó el modal sin revisar qué elemento
recibía el foco.

### Deuda que queda abierta

- Solo Chromium. Firefox y WebKit se pueden agregar como proyectos de
  Playwright si se vuelve necesario.
- La suite comparte la base con desarrollo en local (los datos `98…` se
  borran y se vuelven a sembrar en cada corrida).

---

## 2026-10-22 — Cero `any` y lint sin tolerancia a avisos

### Qué se identificó

Quedaban 36 `any` (deuda abierta desde la fase de calidad del 17 de octubre),
y el CI toleraba hasta 50 avisos de lint. Con ese margen, un `any` nuevo
entraba sin que nadie lo notara.

### Qué se hizo

- **30 de los 36 eran `catch (err: any)`** para leer `err.code` y `err.status`.
  Se reemplazaron por un helper tipado, `mensajeDeError(err: unknown)` en
  `services/errorMessages.ts`, que reconoce `ApiRequestError` y si no cae en el
  mensaje genérico. Antes, un error que no viniera de la API (un `TypeError`,
  por ejemplo) se leía como si tuviera `code`; ahora el tipo obliga a comprobarlo.
- **Login:** la comprobación de `DOMAIN_NOT_ALLOWED` pasa por
  `err instanceof ApiRequestError`.
- **Filtros de búsqueda:** `params: any` pasa a `StudentSearchParams` y
  `{ area?: number }`.
- **Perfil:** los valores del formulario se tipan como `DisponibilidadTipo` y
  `EstadoBusqueda`.
- **Backend:** `req.user as any` pasa a `req.user!` (como en el resto de los
  controladores) y los valores de la consulta SQL a `unknown[]`. Al tiparlo
  apareció que `codigo_cucei` puede ser `null`; se comprobó que ambas rutas
  pasan por `requireOnboarded`, así que no era un bug, y se usa la misma
  aserción que los demás controladores.

### Resultado medido

|                        | Antes | Después   |
| ---------------------- | ----- | --------- |
| `any` en el código     | 36    | **0**     |
| `no-explicit-any`      | aviso | **error** |
| Avisos tolerados en CI | 50    | **0**     |

Siguen pasando las 109 pruebas de backend y las 29 de e2e.

---

## 2026-10-22 — Content Security Policy estricta para scripts

### Qué se identificó

El frontend no tenía ninguna CSP: no existía `vercel.json` y la CSP de helmet
solo protege las respuestas de la API, no el HTML de la SPA. Además, dos
manejadores `onerror` en línea (el avatar de Perfil y la mascota de la página
de error) y un `<script>` en línea en `index.html` impedían activar una política
estricta. La bitácora del 12 de octubre ya lo marcaba como deuda.

### Por qué importaba

Las vistas pintan HTML con `innerHTML`. Todo pasa por `escapeHtml`, pero basta
un descuido para que un dato del usuario se convierta en un XSS. Una CSP sin
`'unsafe-inline'` en `script-src` es la segunda línea de defensa: aunque se
inyecte HTML, el navegador se niega a ejecutar scripts y manejadores en línea.

### Alternativas evaluadas

- **Cabecera en `vercel.json`.** Es lo canónico, pero solo aplica en Vercel: en
  desarrollo y en las pruebas e2e no habría CSP, y una violación se
  descubriría hasta producción.
- **Elegida: `<meta http-equiv>` generada por un plugin de Vite**
  (`frontend/vite.config.ts`). Aplica igual en desarrollo, en e2e y en el build,
  y calcula el origen de la API a partir de `VITE_API_URL`. Su límite es que una
  meta no admite `frame-ancestors`; si hace falta protección contra
  clickjacking, se agrega como cabecera en el hosting.

### Qué se hizo

- **CSP:** `script-src 'self' https://accounts.google.com/gsi/client`, sin
  `'unsafe-inline'` ni `'unsafe-eval'`; `object-src 'none'`, `base-uri` y
  `form-action` limitados a `'self'`. También se declaran los orígenes de Google
  Identity, Google Fonts y las fotos de `googleusercontent.com`.
- **`onerror` en línea →** `utils/respaldoImagenes.ts`, un solo listener en
  fase de captura que atiende `data-respaldo="iniciales"` y
  `data-respaldo="siguiente"`, incluidas las imágenes insertadas después.
- **Script del tema →** `public/tema-inicial.js`: sigue siendo síncrono en el
  `<head>`, así que no reaparece el parpadeo.
- `style-src` conserva `'unsafe-inline'` (ver deuda).

### Resultado medido

- 4 pruebas e2e nuevas (33 en total): la CSP existe y no permite scripts en
  línea; un `<img onerror>` y un `<script>` inyectados **no se ejecutan**
  (el navegador reporta 2 violaciones de `script-src`); los dos respaldos de
  imagen siguen funcionando.
- **Vigilante en todas las pruebas:** cualquier violación de la CSP hace fallar
  la prueba en la que ocurre, así que una vista nueva con un script en línea no
  pasa el CI. Se excluyen las descargas que hace axe de Google Fonts para
  auditar, porque la app nunca las pide con `fetch`.
- Verificado a mano que el botón real de Google se dibuja con la CSP activa,
  sin violaciones.

### Deuda que queda abierta

- **`style-src 'unsafe-inline'`:** quedan ~49 atributos `style=` en las vistas y
  un `<style>` en el login. Quitarlo exige moverlos a clases; el riesgo de
  estilos en línea es mucho menor que el de scripts.
- **El origen `http://localhost:5199`** (puerto de desarrollo actual) no está
  autorizado en el Client ID de Google: el botón carga, pero Google responde 403.
  Se agrega en Google Cloud Console (ver `docs/setup-google-oauth.md`). No tiene
  relación con la CSP.

---

## 2026-10-22 — Repositorio formateado y `format:check` en CI

### Qué se identificó

38 archivos heredados no seguían el estilo de Prettier. Por eso el CI no podía
correr `format:check`, y cada commit que tocaba uno de esos archivos lo
reformateaba entero y mezclaba ruido con el cambio real (deuda anotada el
17 de octubre).

### Qué se hizo

- **Un commit de solo formato** (`style: formatear con Prettier...`): 38 archivos,
  sin cambios de comportamiento. Se verificó con lint, las 109 pruebas de
  backend, el build y las 33 de e2e.
- **`.git-blame-ignore-revs`** con ese commit: GitHub lo lee solo, así que
  `git blame` sigue mostrando al autor real de cada línea. En local se activa
  con `git config blame.ignoreRevsFile .git-blame-ignore-revs`.
- **Paso `Prettier` en el job de Lint** del CI (`npm run format:check`). Un
  archivo sin formatear rompe el build; el hook de commit (lint-staged) ya lo
  formatea solo, así que en la práctica solo lo atrapa si alguien se salta el hook.
- `format` y `format:check` cubren también `frontend/vite.config.ts`.

### Importante al mergear

Este PR debe mergearse con **merge commit** (como los anteriores), no con
squash ni rebase: esos cambian el hash del commit de formato y
`.git-blame-ignore-revs` dejaría de encontrarlo.

---

## 2026-10-23 — Pulido de interfaz, fase A: textos, enlaces muertos y detalles

**Rama:** `angel/pulido-ui-fase-a` (desde `main`)

### Qué se identificó

Una revisión visual de las 9 vistas (claro, oscuro y móvil) encontró que la
interfaz se lee como una plantilla generada: el diseño de origen salió de los
mockups de Google Stitch y conserva sus tokens de Material You, su tipografía
y sus convenciones de texto. Esta fase corrige lo que no depende de un
rediseño; la paleta, la tipografía y el layout van en las fases B y C.

- **Mayúsculas al estilo inglés** en ~40 textos ("Áreas de Interés",
  "Seleccionar Archivo", "Solicitar Asesoría"). En español solo va mayúscula
  inicial. Etiquetas en inglés: "Hard Skills" / "Soft Skills".
- **Etiquetas en MAYÚSCULAS** con espaciado en encabezados de tabla, tarjetas
  de indicadores y grupos de habilidades.
- **Login:** selector de idioma con "English (United States)", contrario a la
  decisión del 22-oct de interfaz solo en español, y enlaces a Ayuda,
  Privacidad y Términos que apuntaban a rutas inexistentes.
- **Tabla de administración:** la columna "Creado" se cortaba a 1440 px porque
  ninguna celda podía partirse en líneas.
- **Sidebar:** "Cerrar sesión" tenía otro tamaño, color y alineación que el
  menú, y era un enlace aunque es una acción. El botón de tema mostraba el
  tema actual ("Modo claro") en vez de lo que hace al pulsarlo.
- **Estados vacíos sin salida:** el perfil decía "Aún no se han registrado
  habilidades" sin forma de agregarlas; Mi proyecto mostraba un botón
  "Buscar asesor" deshabilitado.
- **Movimiento decorativo:** el ícono de tema rebotaba y giraba, y las tarjetas
  y botones se elevaban al pasar el mouse.

### Qué se decidió

- Mayúscula solo inicial en títulos, botones, pestañas y opciones. "Hard/Soft
  Skills" pasan a "Habilidades técnicas/blandas"; "Panel Administrativo" a
  "Administración"; "Asesor / Mentor" a "Asesor".
- Sin `text-transform: uppercase` en etiquetas (solo queda en las iniciales del
  avatar).
- Login sin selector de idioma ni enlaces sin destino. Si en el futuro hay
  páginas reales de ayuda o privacidad, se agregan entonces.
- La columna de título de las tablas se parte en líneas (`.table__titulo`).
- Tema y cerrar sesión comparten estilo con el menú (`.sidebar__action`).
  Cerrar sesión es un `<button>`. El tema dice "Usar tema oscuro/claro".
- Los estados vacíos del perfil explican para qué sirve llenar la sección y
  abren el formulario; "Buscar asesor" lleva a `#/asesores`.
- Se quitan las animaciones de hover y del ícono de tema.

### Resultado

34/34 pruebas e2e en verde, incluidas las auditorías de axe. Se actualizaron
las pruebas que buscaban los textos anteriores y la de cerrar sesión (ahora
busca un botón, no un enlace).

### Pendiente detectado para la fase B

El escudo del login y la barra superior se carga desde
`lh3.googleusercontent.com/aida-public/...`, una imagen generada por Stitch y
no el archivo oficial de la UdeG. Debe reemplazarse por el escudo oficial
servido desde `frontend/public/`.

---

## 2026-10-23 — Rediseño, fase B: identidad UdeG, tipografía propia, íconos SVG y CSP de estilos

**Rama:** `angel/rediseno-fase-b` (desde `angel/pulido-ui-fase-a`)

### Qué se identificó

- La paleta era la de Material You que generó Stitch (tokens como
  `--color-on-primary-fixed-variant`), con un verde menta sin relación con la
  universidad en el menú activo y los botones secundarios.
- Inter y Material Symbols llegaban desde Google Fonts. Mientras cargaba la
  fuente de íconos, la página mostraba sus nombres como texto ("search",
  "close").
- El escudo del login era una imagen generada por Stitch y se cargaba desde
  `lh3.googleusercontent.com/aida-public/…`, no el escudo oficial.
- El login copiaba la pantalla de acceso de Google (sus colores, Roboto) y no
  tenía tema oscuro.
- La CSP mantenía `'unsafe-inline'` en `style-src` por 48 atributos `style=`
  y el `<style>` del login.
- Los modales de detalle mostraban "Cancelar" y "Cerrar" a la vez, y otras
  cuatro etiquetas estaban escritas en MAYÚSCULAS en el código.

### Qué se decidió

**Identidad.** Los colores salen del escudo oficial (Wikimedia Commons,
`Escudo UdeG.svg`, dominio público, fuente udg.mx): índigo `#260f55` como
marca y oro `#ffd700` como único acento, usado en pocos lugares (barra de la
sección activa del menú, borde superior del login, paso actual del proyecto
y sellos de folio). El escudo se sirve desde `frontend/public/`. En el
tema oscuro va sobre una placa clara para que su índigo no se pierda.

**Tipografía.** Source Sans 3 para la interfaz. Source Serif 4 solo para lo
que en papel sería un documento: títulos de proyecto y folios. Ambas se
sirven desde el propio sitio con `@fontsource` (versión 5.3.0 fijada; la
5.3.1 tenía menos de dos semanas).

**Tokens.** Nombres semánticos en español (`--c-marca`, `--c-texto-2`,
`--c-borde`…). Todos los pares de texto cumplen WCAG AA en ambos temas
(mínimo 5.6:1) y los bordes de controles superan 3:1. Los paneles se separan
del fondo con una línea de 1px en lugar de sombra. Los radios dependen de la
jerarquía: 4px en insignias, 6px en controles y 8px en paneles.

**Íconos.** SVG en línea de Lucide (`lucide-static`, ISC) mediante
`utils/iconos.ts`. Solo entran al bundle los 42 que se usan.

**CSP.** En producción, `style-src 'self'` más la hoja de Google Identity,
sin `'unsafe-inline'`. En desarrollo, Vite necesita inyectar `<style>`, así
que se separa: `style-src-elem` permite elementos en línea y
`style-src-attr 'none'` sigue bloqueando atributos. Por eso las pruebas e2e
fallan si una vista vuelve a usar `style=`. Se descartó usar un nonce: exige
un valor distinto en cada petición y el despliegue en Vercel es estático.

### Resultado

- 0 atributos `style=` y 0 `<style>` en las vistas; `font-src 'self'`.
- 35/35 e2e en verde. Hay una prueba nueva: un `style=` inyectado provoca
  una violación de `style-src-attr` y no se aplica.
- Se probó el build de producción con `vite preview`: fuentes, escudo y
  estilos cargan sin violaciones de CSP.
- Se corrigieron de paso: los filtros en móvil quedaban alineados a la
  derecha; los modales de detalle tenían dos botones de cierre; el filtro de
  semestre tenía una etiqueta sin campo asociado; "Mentor" pasa a "Asesor"
  en la tabla de administración, para usar la misma palabra en toda la app.

### Ajustes tras la revisión

- **Login:** por decisión de David se conserva el diseño original (tarjeta
  centrada). Solo cambian tres cosas: sus estilos pasan a `main.css`, usa el
  escudo oficial y toma la fuente de la app, porque Inter ya no se descarga.
- **Botón de Google que a veces no aparecía:** la vista revisaba
  `window.google` una sola vez al pintarse. En una primera visita sin caché
  el script `async` de Google aún no terminaba y se mostraba "No se pudo
  cargar Google" aunque llegara un momento después. Ahora espera el `load`
  del script, con un límite de 10 s. El error ya existía en `main`.
- **Estilo del botón de Google:** el botón inserta un `style=` fijo con su
  ancho, que `style-src-attr 'none'` bloqueaba. Se permite solo ese valor
  exacto con `'unsafe-hashes'` y su hash SHA-256. Si Google lo cambia, el
  botón funciona igual y solo pierde ese ancho.

### Pendiente para la fase C

Layout por vista: la cabecera del perfil (franja y avatar al estilo red
social), la ficha del proyecto, los indicadores del admin como filtros y el
panel de asesor.
