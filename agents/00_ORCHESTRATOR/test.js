const path = require('path');
const fs = require('fs');
const Orchestrator = require('./orchestrator');
const { loadSettings, topoSort } = require('../shared/validator');

const ROOT = path.resolve(__dirname, '..', '..');

async function main() {
  const checks = [];

  const settings = loadSettings(ROOT);
  checks.push(['settings.json válido', true]);

  const order = topoSort(settings.agents.agents);
  checks.push(['topo sort sin ciclos', order.length === Object.keys(settings.agents.agents).length]);

  for (const [name, cfg] of Object.entries(settings.agents.agents)) {
    const exists = fs.existsSync(path.join(ROOT, cfg.path));
    checks.push([`path de ${name} existe`, exists]);
  }

  const orc = new Orchestrator();
  await orc.initialize();
  checks.push(['Orchestrator.initialize() ok', orc.executionOrder.length > 0]);

  let allOk = true;
  for (const [name, ok] of checks) {
    const icon = ok ? 'OK' : 'FAIL';
    console.log(`[${icon}] ${name}`);
    if (!ok) allOk = false;
  }
  console.log(allOk ? '\nORCHESTRATOR test OK' : '\nORCHESTRATOR test FAILED');
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error('ORCHESTRATOR test ERROR:', err.message);
  process.exit(1);
});
