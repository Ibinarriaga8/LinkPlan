const fs = require('fs');
const path = require('path');

function loadSettings(root) {
  const file = path.join(root, 'settings.json');
  if (!fs.existsSync(file)) {
    throw new Error(`settings.json no encontrado en ${root}`);
  }
  const raw = fs.readFileSync(file, 'utf-8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`settings.json malformado: ${err.message}`);
  }
  validateSettings(parsed);
  return parsed;
}

function validateSettings(settings) {
  const errors = [];
  if (!settings.system?.version) errors.push('system.version requerido');
  if (!settings.agents?.agents) errors.push('agents.agents requerido');
  if (settings.agents?.agents) {
    for (const [name, cfg] of Object.entries(settings.agents.agents)) {
      if (!cfg.id) errors.push(`agente ${name} sin id`);
      if (!cfg.path) errors.push(`agente ${name} sin path`);
      if (!Array.isArray(cfg.dependencies)) errors.push(`agente ${name} dependencies no es array`);
    }
  }
  if (errors.length) {
    throw new Error('Settings inválido:\n - ' + errors.join('\n - '));
  }
  return true;
}

function topoSort(agentsMap) {
  const visited = new Set();
  const ordered = [];
  function visit(name, stack = new Set()) {
    if (visited.has(name)) return;
    if (stack.has(name)) throw new Error(`Ciclo de dependencias detectado en ${name}`);
    stack.add(name);
    const cfg = agentsMap[name];
    if (!cfg) throw new Error(`Agente referenciado pero no definido: ${name}`);
    for (const dep of cfg.dependencies || []) visit(dep, stack);
    stack.delete(name);
    visited.add(name);
    ordered.push(name);
  }
  for (const name of Object.keys(agentsMap)) visit(name);
  return ordered;
}

module.exports = { loadSettings, validateSettings, topoSort };
