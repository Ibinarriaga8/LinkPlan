const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { Logger } = require('../shared/logger');
const { ApiClient } = require('../shared/api-client');

const ROOT = path.resolve(__dirname, '..', '..');

function runCommand(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn(cmd, args, { cwd: opts.cwd || ROOT, env: process.env });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => { err += d.toString(); });
    child.on('close', (code) => {
      resolve({ ok: code === 0, code, stdout: out, stderr: err, durationMs: Date.now() - start });
    });
    child.on('error', (e) => {
      resolve({ ok: false, code: -1, stdout: out, stderr: err + e.message, durationMs: Date.now() - start });
    });
  });
}

class QAAgent {
  constructor({ logger, settings, root } = {}) {
    this.logger = logger || new Logger({ agent: 'QA' });
    this.settings = settings;
    this.root = root || ROOT;
    this.api = new ApiClient({ baseUrl: `http://localhost:${settings?.backend?.port || 4000}` });
  }

  async initialize() {}

  async lint() {
    this.logger.info('Ejecutando lint backend');
    return runCommand('npm', ['--prefix', 'backend', 'run', 'lint']);
  }

  async unitTests() {
    this.logger.info('Ejecutando tests backend');
    return runCommand('npm', ['--prefix', 'backend', 'run', 'test']);
  }

  syntaxCheck() {
    const dir = path.join(this.root, 'agents', '03_DEVELOPER', 'generated');
    if (!fs.existsSync(dir)) return { ok: true, files: [], errors: [] };
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
    const errors = [];
    for (const f of files) {
      const full = path.join(dir, f);
      const { execSync } = require('child_process');
      try {
        execSync(`node --check "${full}"`, { stdio: 'pipe' });
      } catch (err) {
        errors.push({ file: f, error: err.stderr?.toString() || err.message });
      }
    }
    return { ok: errors.length === 0, files, errors };
  }

  async healthPing() {
    return this.api.health();
  }

  async run() {
    const [lint, unitTests, healthPing] = await Promise.all([
      this.lint(),
      this.unitTests(),
      this.healthPing()
    ]);
    const syntax = this.syntaxCheck();

    const report = {
      lint:        { ok: lint.ok, durationMs: lint.durationMs, output: tail(lint.stdout + lint.stderr) },
      unitTests:   { ok: unitTests.ok, durationMs: unitTests.durationMs, output: tail(unitTests.stdout + unitTests.stderr) },
      syntaxCheck: syntax,
      healthPing
    };

    const failed = [];
    if (!report.lint.ok) failed.push('lint');
    if (!report.unitTests.ok) failed.push('unitTests');
    if (!report.syntaxCheck.ok) failed.push('syntaxCheck');

    this.logger.info('QA report', { failed: failed.length ? failed : 'none' });
    return {
      status: failed.length ? 'failed' : 'ok',
      output: report,
      errors: failed
    };
  }
}

function tail(s, lines = 20) {
  return (s || '').split('\n').slice(-lines).join('\n');
}

module.exports = QAAgent;
