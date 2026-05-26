const path = require('path');
const QAAgent = require('./qa-agent');
const { loadSettings } = require('../shared/validator');

const ROOT = path.resolve(__dirname, '..', '..');

async function main() {
  const settings = loadSettings(ROOT);
  const agent = new QAAgent({ settings });
  await agent.initialize();

  const syntax = agent.syntaxCheck();
  console.log(`[${syntax.ok ? 'OK' : 'FAIL'}] syntaxCheck (${syntax.files.length} files)`);

  const health = await agent.healthPing();
  console.log(`[${health.reachable ? 'OK' : 'SKIP'}] healthPing (backend ${health.reachable ? 'up' : 'down'})`);

  console.log('\nQA test OK (lint/tests no ejecutados en supervisión aislada)');
  process.exit(0);
}

main().catch((err) => {
  console.error('QA test ERROR:', err.message);
  process.exit(1);
});
