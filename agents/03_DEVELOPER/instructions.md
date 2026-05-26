# DEVELOPER AGENT - Generación de código

## Objetivo
Generar artefactos de código alineados con el stack real de LINK & PLAN:
- Endpoints Express 5 + Zod + Prisma (CommonJS)
- Componentes React + TypeScript para `frontend/src/`

## Salidas
Por defecto los archivos generados se escriben en
`agents/03_DEVELOPER/generated/` para revisión antes de copiarlos al árbol
real. NO se modifican `backend/src/server.js` ni `frontend/src/` directamente.

## Plantillas
1. `endpoint`: ruta REST con validación Zod, query Prisma y manejo de errores.
2. `component`: componente React funcional con tipos TS y Tailwind.

## Entrada esperada de `run()`
```
{
  endpoints: [{ name, method, path, model, fields }],
  components: [{ name, props }]
}
```

## Supervisión aislada
```
node agents/03_DEVELOPER/test.js
```
Genera un endpoint y un componente sample y valida que el código resultante
parsea con `node --check` (para JS) o con el parser TypeScript del frontend si
está disponible.
