# QA AGENT - Tests, performance y reporting

## Objetivo
Ejecutar las verificaciones de calidad sobre el backend (lint + tests) y sobre
los artefactos generados por DEVELOPER, y reportar al ORCHESTRATOR.

## Acciones
1. `lint`: ejecuta `npm --prefix backend run lint` (lint ligero con node --check).
2. `unitTests`: ejecuta `npm --prefix backend run test` (node --test).
3. `syntaxCheck`: pasa `node --check` sobre cada archivo `.js` en `agents/03_DEVELOPER/generated/`.
4. `healthPing`: GET http://localhost:4000/health (si está levantado).

## Salida
```
{
  lint: { ok, durationMs, output },
  unitTests: { ok, durationMs, output },
  syntaxCheck: { ok, files, errors },
  healthPing: { reachable, status }
}
```

## Comportamiento
- Si el backend no está levantado, `healthPing` reporta `reachable: false` pero
  no marca el agente como `failed`.
- Si lint o tests fallan, `status: failed` y se escalan al ORCHESTRATOR.

## Supervisión aislada
```
node agents/04_QA/test.js
```
