# ORCHESTRATOR - Agente Organizador

## Objetivo
Director central que carga `settings.json`, valida la topología de agentes y ejecuta workflows en orden de dependencias.

## Responsabilidades
1. Validar `settings.json` y `memory.md` accesibles.
2. Resolver el orden topológico de agentes (DATABASE → TRENDS → DEVELOPER → QA).
3. Instanciar y ejecutar cada agente respetando dependencias.
4. Capturar errores por agente y decidir continue/abort.
5. Registrar cada ejecución en `logs/execution-history.json`.

## Contrato de agente
Cada agente debe exportar una clase con:
```
class Agent {
  constructor({ logger, settings, deps }) {}
  async initialize() {}                 // setup ligero (no I/O bloqueante crítico)
  async run(input)                      // devuelve { status, output, errors }
  async shutdown() {}                   // libera recursos
}
```

Donde `status ∈ { 'ok', 'skipped', 'failed' }`. `skipped` se usa cuando faltan
recursos externos (BD, backend levantado) pero el agente sigue siendo válido
estructuralmente.

## Workflows
- `full`: DATABASE → TRENDS → DEVELOPER → QA
- `frontend-only`: DEVELOPER (sólo generadores de componente) → QA
- `api-only`: DATABASE → DEVELOPER (sólo generadores de endpoint) → QA

## Supervisión aislada
```
node agents/00_ORCHESTRATOR/test.js
```
Debe completarse SIN BD ni backend levantados, validando únicamente:
- settings.json parseable y válido
- topo sort sin ciclos
- todos los `path` de agentes existen en disco
