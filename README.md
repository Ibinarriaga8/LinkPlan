# LINK & PLAN (Full-Stack)

Production-ready full-stack implementation of LINK & PLAN with:
- **Frontend:** Next.js + React + Tailwind
- **Backend:** Node.js + Express REST API
- **Database:** PostgreSQL + Prisma ORM
- **DevOps:** Docker + GitHub Actions CI + Vercel/Render deployment support

## Project Structure

- `/frontend` - Next.js app (users, smart plan generator, reservations, admin data panel)
- `/backend` - Express API, Prisma schema/migrations, plan generation service, seed data
- `docker-compose.yml` - local full-stack startup with PostgreSQL
- `.github/workflows/ci.yml` - lint/test/build/deploy validation pipeline

## Environment Variables

Copy `.env.example` to your local env files and configure values.

Backend:
- `DATABASE_URL`
- `PGPASSWORD`
- `PORT`
- `FRONTEND_URL`

Frontend:
- `NEXT_PUBLIC_API_BASE_URL`

## Local Setup

```bash
npm --prefix backend ci
npm --prefix frontend ci
npm --prefix backend run prisma:generate
npm --prefix backend run prisma:migrate
npm --prefix backend run prisma:seed
npm --prefix backend run dev
npm --prefix frontend run dev
```

Frontend runs at `http://localhost:3000`, API at `http://localhost:4000`.

## Docker Setup

```bash
docker compose up --build
```

## Deployment (Render + Vercel)

El repo está configurado como Blueprint de Render (`render.yaml`) y proyecto Next.js de Vercel (`frontend/vercel.json`).

### 1. Backend + Postgres en Render
1. https://dashboard.render.com → **New +** → **Blueprint**.
2. Conecta GitHub y elige este repo (`Ibinarriaga8/LinkPlan`). Render lee `render.yaml` y propone crear:
   - `link-plan-db` (PostgreSQL free)
   - `link-plan-api` (Web Service Node, root `backend/`)
3. Pulsa **Apply**. La BD se crea primero; cuando esté `available`, el web service la consume vía `fromDatabase` (no hace falta pegar `DATABASE_URL` a mano).
4. Espera al primer build: `npm ci && prisma generate && prisma migrate deploy` (las migraciones se aplican aquí).
5. Cuando el servicio esté `Live`, comprueba el healthcheck:
   ```bash
   curl https://link-plan-api.onrender.com/health   # ajusta el nombre real
   ```
6. Anota la URL pública del API.

### 2. Frontend en Vercel
1. https://vercel.com/new → importa el repo.
2. **Root Directory** = `frontend` (Vercel autodetecta Next.js).
3. En **Environment Variables**, añade:
   - `NEXT_PUBLIC_API_BASE_URL` = `https://link-plan-api.onrender.com` (la URL del paso 1.6)
4. Deploy. Anota la URL pública (`https://<proyecto>.vercel.app`).

### 3. Cablear CORS (volver a Render)
1. En el dashboard de Render → `link-plan-api` → **Environment** → añade/edita:
   - `FRONTEND_URL` = `https://<proyecto>.vercel.app`
2. Redeploy del servicio (Render lo hace solo al cambiar env vars).

### 4. Verificación
```bash
curl https://link-plan-api.onrender.com/health
curl https://link-plan-api.onrender.com/api/venues
open https://<proyecto>.vercel.app
```

### Notas de producción
- La seed (`prisma:seed`) **no se ejecuta en Render**; la base arranca vacía. Si quieres datos demo, lánzala una vez manualmente desde Render Shell.
- El plan free de Render duerme tras 15 min sin tráfico (primera request tras dormir tarda ~30s).
- La Postgres free de Render dura 90 días; tras eso hay que migrar a un plan de pago o re-provisionar.

## API Coverage

- `GET/POST/DELETE /api/users`
- `POST /api/plans/generate`
- `GET/POST /api/reservations`
- `GET /api/admin/data`
- `GET /api/venues`
