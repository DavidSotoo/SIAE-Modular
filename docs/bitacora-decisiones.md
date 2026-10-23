# Bitácora de decisiones — SIAE-Modular

Registro de cambios relevantes al plan de construcción: qué cambió, por qué y quién lo decidió. Referenciada en el Sprint 1 de Construcción, sección 6.

---

## 2026-09-17 — Login institucional con Google reemplaza login local por código+contraseña

**Qué cambió:** el diseño validado en el Sprint 2 (DT-04) especificaba JWT + BCrypt con login local (código CUCEI + contraseña). Se reemplaza por "Iniciar sesión con Google" (OAuth 2.0 / OpenID Connect), restringido por dominio institucional:

- `@alumnos.udg.mx` → rol alumno
- `@academicos.udg.mx` → rol mentor
- Lista blanca de correos (`ADMIN_EMAILS`) → rol admin, sin depender de dominio

El JWT propio de la aplicación se sigue emitiendo igual que antes tras la verificación del ID Token de Google — RBAC y middleware sin cambios.

**Por qué:** evita que el equipo tenga que gestionar contraseñas de alumnos/mentores o pedir acceso directo a la base de datos/API institucional de la UDG para validarlas. Ambos dominios institucionales corren sobre Google Workspace for Education (confirmado en el sitio de CUCEI), así que la restricción por dominio es técnicamente confiable (usa el claim `hd` del token, firmado por Google).

**Efecto en el esquema:** el correo institucional no incluye el código CUCEI de 9 dígitos (formato `nombre.apellidoNNNN@alumnos.udg.mx`), así que `codigo_cucei` pasa a ser opcional a nivel de columna y se captura aparte, solo para alumnos, en un paso de "completa tu perfil" la primera vez que inician sesión. `password_hash` también pasa a ser opcional (ya no aplica a cuentas creadas por Google).

**Efecto secundario:** cierra de paso el IMF-01 (Sprint 3), que pedía que un usuario "pueda registrarse, iniciar sesión..." — no existía autoregistro; login con Google + completar perfil es ese flujo.

**Quién lo decidió:** Angel Soto Delgado, con orientación de Claude Code. Implementado en la rama `angel/etapa1-login-google`, pendiente de revisión por Ricardo (validación por etapa) e Ivie (toca directamente Etapa 2, motor de estados / autenticación).

**Pendiente:** configurar el OAuth Client ID en Google Cloud Console (solo lo puede hacer quien tenga acceso al proyecto de Google de la organización) y probar el flujo con una cuenta institucional real antes de dar por cerrada la etapa.

---

## 2026-10-17 — El máximo de integrantes por equipo queda en 5

**Qué cambió:** el Sprint 2 de Diseño y el esquema inicial hablaban de un máximo de **3 integrantes** por proyecto. Con SM-40 el límite subió a **5**, y así estaba ya implementado, pero la cifra vieja seguía apareciendo en documentos y comentarios. Queda confirmado que **5 es el valor oficial**.

**Por qué:** la auditoría técnica del 12 de octubre detectó la contradicción: el código validaba 5 (`MAX_MEMBERS`), mientras que el plan de construcción y el comentario de `001_init.sql` seguían diciendo 3. Un límite ambiguo es justo el tipo de regla que se implementa distinto en dos lugares.

**Dónde vive la regla:** el límite **no** es una restricción de base de datos; se valida en el servicio, al crear la solicitud y otra vez al aceptarla, esta segunda vez dentro de una transacción con bloqueo de fila para que dos aceptaciones simultáneas no dejen un equipo de 6.

- Fuente única: `MAX_MEMBERS` en `backend/src/services/teamRequest.service.ts`.
- El frontend la espeja en `frontend/src/constants.ts` (`MAX_INTEGRANTES`), que alimenta el mensaje de error y el botón "Equipo completo".

**Efecto de esta decisión:** ninguno en el código, que ya cumplía. Se corrigió el comentario desactualizado de la migración inicial para que el esquema no contradiga al código, y se deja constancia aquí.

**Verificación:** cubierto por las pruebas de integración, que arman un equipo hasta 5 y comprueban que el sexto recibe `409 PROJECT_FULL`.

**Quién lo decidió:** Angel Soto Delgado.

---

## 2026-10-22 — La interfaz es solo en español de México (sin i18n)

**Qué cambió:** desde la fase de Diseño (17-oct) quedaba abierto si los textos se centralizaban en un catálogo para traducirlos. Se decide que **la interfaz queda solo en español de México (es-MX)**, sin catálogo ni selector de idioma. Los textos siguen escritos en cada vista.

**Por qué:** es una herramienta institucional de CUCEI cuyos usuarios (alumnos, mentores y administración) trabajan en español. Centralizar ~2,800 líneas de vistas sería un refactor grande con riesgo de regresiones y sin un usuario que lo necesite hoy. Si más adelante entran usuarios que no hablan español (por ejemplo, de intercambio), se retoma.

**Lo que sí se corrigió:** 6 fechas se formateaban con el idioma del navegador (`toLocaleDateString()` sin argumentos), así que un navegador en inglés mostraba "10/22/2026" (el mes primero) en una app en español. Ahora todas pasan por `frontend/src/utils/fechas.ts`:

- `formatearFecha` → "22 oct 2026"
- `formatearFechaHora` → "22 oct 2026, 9:41 p.m."

Ambas usan locale `es-MX` y zona `America/Mexico_City` fijos, así una fecha se lee igual desde cualquier lugar. Lo cubre una prueba e2e con el navegador en `en-US` y zona `Asia/Tokyo`.

**Regla a partir de aquí:** las fechas nuevas se formatean con esos helpers, nunca con `toLocale*()` sin argumentos.

**Quién lo decidió:** Angel Soto Delgado.
