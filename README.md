# SIAE-Modular (Link Project)

Sistema Integral de Administración de Equipos Modulares — CUCEI, Ingeniería en Informática.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Vite + TypeScript (SPA), sin framework pesado (según Sprint 2) |
| Backend | Node.js + Express + TypeScript |
| Base de datos | PostgreSQL (Neon/Supabase en prod, Docker local en dev) |
| Auth | JWT + BCrypt + RBAC |
| Contenedores | Docker (solo entorno local) |
| Despliegue | Vercel (frontend + funciones serverless del backend) |

## Estructura del repo

```
siae-modular/
├── frontend/           # SPA - consumida por alumnos, mentores, admin
│   └── src/
│       ├── pages/       # Vistas por rol
│       ├── components/  # UI reutilizable (salida de Stitch → aquí)
│       ├── services/    # Llamadas a la REST API
│       ├── types/       # Tipos compartidos (Project, User, Folio, etc.)
│       ├── router/
│       └── styles/
├── backend/
│   └── src/
│       ├── routes/       # Definición de endpoints REST
│       ├── controllers/  # Lógica de request/response
│       ├── services/     # Lógica de negocio (motor de estados aquí)
│       ├── middleware/   # auth (JWT), RBAC, validaciones
│       ├── models/       # Acceso a datos (queries a Postgres)
│       ├── config/       # conexión DB, env
│       └── utils/
├── database/
│   ├── migrations/       # Scripts SQL versionados (001_init.sql, ...)
│   └── seeds/            # Datos de prueba
├── docs/                 # Documentos de sprints (contexto del proyecto)
└── docker-compose.yml    # Postgres local para desarrollo
```

## Orden de construcción (según Sprint 3)

- [ ] Etapa 1 — Esquema PostgreSQL + Módulo de Autenticación (JWT, RBAC)
- [ ] Etapa 2 — Motor de Estados + API REST
- [ ] Etapa 3 — Módulo de Gestión Documental (PDFs)
- [ ] Etapa 4 — Interfaces SPA por rol
- [ ] Etapa 5 — Módulo Administrativo (folios, exportación CSV/Excel)

## Variables de entorno necesarias

Ver `backend/.env.example` y `frontend/.env.example`.
