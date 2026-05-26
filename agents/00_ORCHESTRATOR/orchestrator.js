const fs = require('fs');
const path = require('path');
const { Logger } = require('../shared/logger');
const { loadSettings, topoSort } = require('../shared/validator');

const ROOT = path.resolve(__dirname, '..', '..');

class Orchestrator {
  constructor({ root = ROOT, logger } = {}) {
    this.root = root;
    this.logger = logger || new Logger({ agent: 'ORCHESTRATOR' });
    this.settings = null;
    this.agentInstances = {};
    this.executionOrder = [];
  }

  async initialize() {
    this.logger.info('Inicializando ORCHESTRATOR');
    this.settings = loadSettings(this.root);
    const map = this.settings.agents.agents;

    for (const [name, cfg] of Object.entries(map)) {
      const abs = path.join(this.root, cfg.path);
      if (!fs.existsSync(abs)) {
        throw new Error(`Agente ${name}: path no existe (${cfg.path})`);
      }
    }

    this.executionOrder = topoSort(map).filter((n) => n !== 'ORCHESTRATOR');
    this.logger.info('Orden de ejecución resuelto', { order: this.executionOrder });
    return this;
  }

  async loadAgent(name) {
    if (this.agentInstances[name]) return this.agentInstances[name];
    const cfg = this.settings.agents.agents[name];
    const dir = path.join(this.root, cfg.path);
    const entry = this.findAgentEntry(dir, name);
    const Agent = require(entry);
    const deps = {};
    for (const depName of cfg.dependencies) {
      if (depName === 'ORCHESTRATOR') continue;
      deps[depName] = await this.loadAgent(depName);
    }
    const instance = new Agent({
      logger: new Logger({ agent: name }),
      settings: this.settings,
      deps,
      root: this.root
    });
    if (typeof instance.initialize === 'function') await instance.initialize();
    this.agentInstances[name] = instance;
    return instance;
  }

  findAgentEntry(dir, name) {
    const candidates = fs.readdirSync(dir).filter((f) => f.endsWith('-agent.js') || f === 'orchestrator.js');
    if (!candidates.length) throw new Error(`No se encontró entry .js para agente ${name} en ${dir}`);
    return path.join(dir, candidates[0]);
  }

  async executeWorkflow(workflow = 'full', input = {}) {
    const start = Date.now();
    const results = {};
    const filter = this.workflowFilter(workflow);

    try {
      for (const name of this.executionOrder) {
        if (!filter.includes(name)) {
          this.logger.info(`Saltando ${name} (no en workflow ${workflow})`);
          continue;
        }
        this.logger.info(`Ejecutando ${name}`);
        const agent = await this.loadAgent(name);
        const result = await agent.run(input[name] || {});
        results[name] = result;
        if (result.status === 'failed') {
          this.logger.error(`Agente ${name} falló`, { errors: result.errors });
          if (this.isCritical(name)) throw new Error(`Agente crítico ${name} falló`);
        }
      }
      const durationMs = Date.now() - start;
      this.logger.recordExecution(workflow, 'ok', durationMs, { agents: Object.keys(results) });
      this.logger.info('Workflow completado', { workflow, durationMs });
      return { status: 'ok', durationMs, results };
    } catch (err) {
      const durationMs = Date.now() - start;
      this.logger.recordExecution(workflow, 'failed', durationMs, { error: err.message });
      this.logger.error('Workflow abortado', { error: err.message });
      return { status: 'failed', durationMs, error: err.message, results };
    } finally {
      await this.shutdown();
    }
  }

  workflowFilter(workflow) {
    switch (workflow) {
      case 'frontend-only': return ['DEVELOPER', 'QA'];
      case 'api-only': return ['DATABASE', 'DEVELOPER', 'QA'];
      case 'full':
      default:
        return this.executionOrder;
    }
  }

  isCritical(name) {
    return name === 'DATABASE';
  }

  async shutdown() {
    for (const [name, instance] of Object.entries(this.agentInstances)) {
      if (typeof instance.shutdown === 'function') {
        try { await instance.shutdown(); } catch (err) {
          this.logger.warn(`shutdown(${name}) lanzó error`, { error: err.message });
        }
      }
    }
    this.agentInstances = {};
  }
}

module.exports = Orchestrator;

if (require.main === module) {
  (async () => {
    const orc = new Orchestrator();
    await orc.initialize();
    const arg = process.argv.find((a) => a.startsWith('--'));
    const workflow = arg ? arg.replace(/^--/, '') : 'full';
    const result = await orc.executeWorkflow(workflow);
    process.exit(result.status === 'ok' ? 0 : 1);
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
