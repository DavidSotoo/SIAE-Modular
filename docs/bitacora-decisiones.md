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
