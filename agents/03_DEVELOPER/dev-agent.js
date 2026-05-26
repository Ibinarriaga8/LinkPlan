const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { Logger } = require('../shared/logger');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(__dirname, 'generated');

class DeveloperAgent {
  constructor({ logger, deps, root } = {}) {
    this.logger = logger || new Logger({ agent: 'DEVELOPER' });
    this.db = deps?.DATABASE || null;
    this.trends = deps?.TRENDS || null;
    this.root = root || ROOT;
    this.outDir = OUT_DIR;
  }

  async initialize() {
    if (!fs.existsSync(this.outDir)) fs.mkdirSync(this.outDir, { recursive: true });
  }

  renderEndpoint({ name, method = 'GET', path: routePath, model, fields = [] }) {
    const handler = method.toUpperCase();
    const zodFields = fields.map((f) => `    ${f.name}: z.${f.type || 'string'}()${f.optional ? '.optional()' : ''}`).join(',\n');
    const body = handler === 'POST'
      ? `    const input = ${name}Schema.parse(req.body);\n    const created = await prisma.${model}.create({ data: input });\n    res.status(201).json(created);`
      : `    const items = await prisma.${model}.findMany();\n    res.json(items);`;

    return `// Auto-generado por DEVELOPER agent
const { z } = require('zod');

const ${name}Schema = z.object({
${zodFields || '    // sin campos definidos'}
});

module.exports = function register${capitalize(name)}(app, prisma) {
  app.${handler.toLowerCase()}('${routePath}', async (req, res, next) => {
    try {
${body}
    } catch (err) {
      next(err);
    }
  });
};
`;
  }

  renderComponent({ name, props = [] }) {
    const propsType = props.length
      ? `{\n${props.map((p) => `  ${p.name}${p.optional ? '?' : ''}: ${p.type || 'string'};`).join('\n')}\n}`
      : '{}';
    const propsList = props.map((p) => p.name).join(', ');
    return `// Auto-generado por DEVELOPER agent
type ${name}Props = ${propsType};

export default function ${name}(${propsList ? `{ ${propsList} }: ${name}Props` : ''}) {
  return (
    <section className="rounded-lg border border-slate-200 p-4">
      <h2 className="text-lg font-semibold">${name}</h2>
${props.map((p) => `      <p className="text-sm text-slate-600">${p.name}: {String(${p.name})}</p>`).join('\n')}
    </section>
  );
}
`;
  }

  writeFile(filename, content) {
    const target = path.join(this.outDir, filename);
    fs.writeFileSync(target, content);
    return target;
  }

  validateJsSyntax(file) {
    try {
      execSync(`node --check "${file}"`, { stdio: 'pipe' });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.stderr?.toString() || err.message };
    }
  }

  async generateEndpoint(spec) {
    const code = this.renderEndpoint(spec);
    const file = this.writeFile(`${spec.name}.endpoint.js`, code);
    const check = this.validateJsSyntax(file);
    this.logger.info('Endpoint generado', { file, valid: check.ok });
    return { file, valid: check.ok, error: check.error };
  }

  async generateComponent(spec) {
    const code = this.renderComponent(spec);
    const file = this.writeFile(`${spec.name}.tsx`, code);
    this.logger.info('Componente generado', { file });
    return { file, valid: true };
  }

  async run({ endpoints = [], components = [] } = {}) {
    if (!endpoints.length && !components.length) {
      endpoints = [{
        name: 'listTrendingVenues',
        method: 'GET',
        path: '/api/trending-venues',
        model: 'venue'
      }];
      components = [{ name: 'TrendingCard', props: [{ name: 'title' }, { name: 'score', type: 'number' }] }];
    }

    const errors = [];
    const out = { endpoints: [], components: [] };

    for (const spec of endpoints) {
      const result = await this.generateEndpoint(spec);
      out.endpoints.push(result);
      if (!result.valid) errors.push(`endpoint ${spec.name}: ${result.error}`);
    }
    for (const spec of components) {
      const result = await this.generateComponent(spec);
      out.components.push(result);
    }

    return {
      status: errors.length ? 'failed' : 'ok',
      output: out,
      errors
    };
  }
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

module.exports = DeveloperAgent;
