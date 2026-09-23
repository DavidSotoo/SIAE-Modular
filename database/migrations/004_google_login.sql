-- SIAE-Modular — Login institucional con Google (decisión registrada en
-- docs/bitacora-decisiones.md): reemplaza el login local por código+contraseña
-- con "Iniciar sesión con Google" restringido a los dominios institucionales
-- @alumnos.udg.mx (alumno) y @academicos.udg.mx (mentor); admin se autoriza
-- por lista blanca de correos (ver backend/.env ADMIN_EMAILS).
--
-- El correo institucional NO trae el código CUCEI de 9 dígitos (es
-- nombre.apellidoNNNN@alumnos.udg.mx), así que codigo_cucei se sigue
-- capturando aparte, solo para alumnos, en un paso de "completa tu perfil"
-- tras el primer login — por eso pasa a ser opcional a nivel de esquema.

ALTER TABLE users
    ADD COLUMN email       VARCHAR(255) UNIQUE,
    ADD COLUMN google_sub  VARCHAR(255) UNIQUE;

ALTER TABLE users
    ALTER COLUMN password_hash DROP NOT NULL,
    ALTER COLUMN codigo_cucei DROP NOT NULL;
