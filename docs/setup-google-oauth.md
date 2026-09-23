# Configurar el OAuth Client ID de Google

Pasos que solo puede hacer una persona con acceso a una cuenta de Google (no necesita ser institucional, pero si van a pedir verificación de app más adelante conviene usar una cuenta de la organización).

## 1. Crear el proyecto y el Client ID

1. Entra a [console.cloud.google.com](https://console.cloud.google.com/) y crea un proyecto nuevo (ej. "SIAE-Modular").
2. Ve a **APIs & Services → OAuth consent screen**.
   - Tipo de usuario: **External** (así puede autenticar cuentas `@alumnos.udg.mx` / `@academicos.udg.mx`, que no son parte de tu organización de Google Cloud).
   - Llena nombre de la app, correo de soporte, dominio (puedes usar `localhost` mientras estás en desarrollo).
3. Ve a **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
   - Tipo de aplicación: **Web application**.
   - **Authorized JavaScript origins:** agrega cada URL desde la que se sirve el frontend, por ejemplo:
     - `http://localhost:5188` (o el puerto que uses en dev)
     - la URL de producción en Vercel cuando la tengan
   - No hace falta "Authorized redirect URIs" — el flujo que usamos (Google Identity Services / One Tap) no redirige, regresa el token directo al frontend.
4. Copia el **Client ID** que te genera (termina en `.apps.googleusercontent.com`).

## 2. Configurarlo en el proyecto

El Client ID del proyecto `siae-modular` ya viene por defecto en el código
(`backend/src/services/googleAuth.service.ts` y `frontend/src/pages/LoginPage.ts`),
así que después de hacer `git pull` no hay que configurarlo. No es un secreto:
el frontend lo manda al navegador de todos modos.

Lo único que cada quien pone en su `backend/.env` es quién entra como admin:

```bash
ADMIN_EMAILS=correo1@ejemplo.com,correo2@ejemplo.com
```

Si algún día cambian de cliente OAuth, pongan el nuevo en los dos lugares
(deben coincidir exactamente); las variables sobrescriben el valor por defecto:

```bash
# backend/.env
GOOGLE_CLIENT_ID=otro-client-id.apps.googleusercontent.com

# frontend/.env
VITE_GOOGLE_CLIENT_ID=otro-client-id.apps.googleusercontent.com
```

Además, cada integrante tiene que estar en **OAuth consent screen → Test users**
mientras la app siga en modo Testing (ver la nota al final).

## 3. Probar

1. Levanta backend y frontend (`npm run dev` en cada uno).
2. Entra a la página de login — debería aparecer el botón real "Acceder con Google" en vez del mensaje de "falta configurar".
3. Inicia sesión con tu correo `@alumnos.udg.mx` real — debería pedirte tu código CUCEI la primera vez (paso de "completa tu perfil") y después entrar a "Mi Perfil".
4. Repite con un correo `@academicos.udg.mx` de un mentor — debería entrar directo (sin pedir código) al Panel de Asesor.
5. Agrega tu propio correo (el que sea) a `ADMIN_EMAILS` y prueba que entra como admin.

## Nota sobre "External" y el límite de 100 usuarios

Mientras la app esté en modo "Testing" en el consent screen, solo pueden iniciar sesión las cuentas que agregues explícitamente en **OAuth consent screen → Test users** (hasta 100). Para que cualquier alumno/mentor de la UDG pueda entrar sin que los des de alta uno por uno, hay que pasar la app a modo **"In production"** — Google puede pedir una revisión si usas scopes sensibles, pero el scope que usamos aquí (perfil básico + email) normalmente no la requiere.
