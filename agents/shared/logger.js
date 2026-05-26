const fs = require('fs');
const path = require('path');

const LEVELS = { DEBUG: 10, INFO: 20, WARN: 30, ERROR: 40 };

class Logger {
  constructor({ agent, level = 'INFO', logDir } = {}) {
    this.agent = agent || 'system';
    this.level = LEVELS[level] ?? LEVELS.INFO;
    this.logDir = logDir || path.resolve(__dirname, '..', '..', 'logs');
    this.file = path.join(this.logDir, 'agent-logs.json');
    this.ensureDir();
  }

  ensureDir() {
    if (!fs.existsSync(this.logDir)) fs.mkdirSync(this.logDir, { recursive: true });
    if (!fs.existsSync(this.file)) fs.writeFileSync(this.file, '');
  }

  emit(level, message, meta) {
    if (LEVELS[level] < this.level) return;
    const entry = {
      ts: new Date().toISOString(),
      level,
      agent: this.agent,
      message,
      meta: meta ?? null
    };
    const line = JSON.stringify(entry);
    process.stdout.write(`[${entry.ts}] ${level.padEnd(5)} ${this.agent} ${message}\n`);
    fs.appendFileSync(this.file, line + '\n');
  }

  debug(msg, meta) { this.emit('DEBUG', msg, meta); }
  info(msg, meta)  { this.emit('INFO', msg, meta); }
  warn(msg, meta)  { this.emit('WARN', msg, meta); }
  error(msg, meta) { this.emit('ERROR', msg, meta); }

  recordExecution(workflow, status, durationMs, meta) {
    const histFile = path.join(this.logDir, 'execution-history.json');
    const entry = {
      ts: new Date().toISOString(),
      workflow,
      status,
      durationMs,
      agent: this.agent,
      meta: meta ?? null
    };
    fs.appendFileSync(histFile, JSON.stringify(entry) + '\n');
  }
}

module.exports = { Logger, LEVELS };
