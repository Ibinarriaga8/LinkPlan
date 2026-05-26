# BASE DE CONOCIMIENTO DEL SISTEMA - LINK & PLAN

## Estado actual del proyecto
- **Fase**: Arquitectura base de agentes IA sobre app full-stack existente
- **App**: LINK & PLAN (planificador de quedadas: usuarios, venues, planes, reservas)
- **Última actualización**: 2026-05-26
- **Agente responsable**: Sistema

## Stack real validado
- Frontend: Next.js 14 + React 18 + Tailwind + TypeScript (`frontend/`, puerto 3000)
- Backend: Node.js + Express 5 + Zod (`backend/`, puerto 4000)
- ORM: Prisma 6 sobre PostgreSQL (`backend/prisma/schema.prisma`)
- DevOps: Docker Compose, GitHub Actions, Vercel/Render

## Modelo de datos (Prisma)
- `User`: id, name, color, foodTags[], activityTags[], pace, createdAt
- `Venue`: id, name, zone, tags[], price, schedule, url, available, type (RESTAURANT|ACTIVITY)
- `Plan`: organizer, morning/lunch/afternoon venues, budget, fecha, participantes
- `PlanParticipant`: tabla puente
- `Reservation`: code, status, plan (1:1)

## Decisiones arquitectónicas
1. Los agentes viven en `agents/` y son procesos Node independientes (CommonJS para alinear con backend).
2. Cada agente expone `instructions.md`, `<agent>.js` (clase exportable) y `test.js` (entrypoint aislado).
3. Los agentes NO duplican el esquema de BD: DATABASE reutiliza el Prisma client del backend.
4. Logs estructurados en `logs/agent-logs.json` y `logs/execution-history.json`.
5. Los tests aislados de cada agente deben funcionar sin BD ni backend levantados (degradación elegante).

## Registro de cambios por agente
### ORCHESTRATOR
- [x] Carga de settings.json y validación
- [x] Resolución de dependencias topológicas
- [ ] Workflows nombrados (full, frontend-only, api-only)

### DATABASE
- [x] Wrapper sobre Prisma client
- [x] Funciones de lectura (users, venues, preferencias agregadas)
- [ ] Funciones de escritura para seeders programáticos

### TRENDS
- [x] Scoring de tags por frecuencia
- [x] Recomendaciones por usuario
- [ ] Cache persistente en disco

### DEVELOPER
- [x] Generador de endpoint Express (plantilla Zod + Prisma)
- [x] Generador de componente React/TS
- [ ] Inyección automática de rutas en server.js

### QA
- [x] Ejecuta `node --test` del backend
- [x] Health check HTTP
- [ ] Métricas de performance

## API contracts existentes
- `GET /api/users`, `POST /api/users`, `DELETE /api/users/:id`
- `GET /api/venues`
- `GET /api/admin/data`
- `POST /api/plans/generate`
- `GET /api/reservations`, `POST /api/reservations`
- `GET /health`

## Problemas conocidos
| Agente | Problema | Severidad | Estado |
|--------|----------|-----------|--------|
| - | - | - | - |

## Configuración validada
- ✅ Next.js setup
- ✅ TypeScript
- ✅ Prisma schema
- [ ] Database connection (depende de `DATABASE_URL`)
- [ ] Environment variables del entorno local
