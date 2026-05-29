# DATABASE AGENT - Acceso a datos

## Objetivo
Capa fina sobre el Prisma client del backend. NO redefine el esquema (ya vive en `backend/prisma/schema.prisma`).

## Modelos disponibles
- `User` (foodTags, activityTags, pace)
- `Venue` (tags, type, price, zone)
- `Plan`, `PlanParticipant`, `Reservation`

## Métodos públicos
- `getAllUsers()`
- `getAllVenues({ type })`
- `getAllPreferences()` → aplana foodTags/activityTags de todos los usuarios
- `getVenueTagFrequencies()` → frecuencias de tags en venues
- `healthCheck()` → ping rápido a la BD
- `upsertVenues(venues)` → inserta/actualiza venues (idempotente por id); devuelve `{ incorporated, updated }`
- `incorporateTrendingVenues()` → descubre lugares en las fuentes de tendencias (vía `newsService.getDiscoveredVenues()`) y los incorpora. Los venues descubiertos llevan id con prefijo `disc-`.

`run()` ahora, además de reportar conteos, ejecuta `incorporateTrendingVenues()`, de modo que el agente no solo lee: también incorpora a la BBDD los lugares nuevos que detecta. Los venues incorporados son de tipo `ACTIVITY` y aparecen en "Mis sitios" y en la generación de planes.

## Comportamiento sin BD
Si `DATABASE_URL` no está definida o la conexión falla, `run()` retorna
`{ status: 'skipped' }`. Esto permite ejecutar el resto del workflow en local
sin Postgres levantado.

## Supervisión aislada
```
node agents/01_DATABASE/test.js
```
Valida que el Prisma client se carga; si hay conexión, ejecuta una query de
prueba; si no, reporta `skipped` sin fallar.
