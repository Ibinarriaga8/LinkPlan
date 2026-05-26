const path = require('path');
const fs = require('fs');
const { Logger } = require('../shared/logger');

function resolvePrismaClient(root) {
  const candidates = [
    path.join(root, 'backend', 'node_modules', '@prisma', 'client'),
    path.join(root, 'node_modules', '@prisma', 'client')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

class DatabaseAgent {
  constructor({ logger, settings, root } = {}) {
    this.logger = logger || new Logger({ agent: 'DATABASE' });
    this.settings = settings;
    this.root = root || path.resolve(__dirname, '..', '..');
    this.prisma = null;
    this.connected = false;
  }

  async initialize() {
    const prismaPath = resolvePrismaClient(this.root);
    if (!prismaPath) {
      this.logger.warn('Prisma client no encontrado; agente en modo degradado');
      return;
    }
    try {
      const { PrismaClient } = require(prismaPath);
      this.prisma = new PrismaClient();
    } catch (err) {
      this.logger.warn('No se pudo instanciar PrismaClient', { error: err.message });
    }
  }

  async healthCheck() {
    if (!this.prisma) return { ok: false, reason: 'no-client' };
    if (!process.env.DATABASE_URL) return { ok: false, reason: 'no-database-url' };
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      this.connected = true;
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: 'connection-failed', error: err.message };
    }
  }

  async getAllUsers() {
    if (!this.connected) return [];
    return this.prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async getAllVenues({ type } = {}) {
    if (!this.connected) return [];
    return this.prisma.venue.findMany({ where: type ? { type } : undefined });
  }

  async getAllPreferences() {
    const users = await this.getAllUsers();
    return users.flatMap((u) => [
      ...u.foodTags.map((tag) => ({ userId: u.id, category: 'food', tag, pace: u.pace })),
      ...u.activityTags.map((tag) => ({ userId: u.id, category: 'activity', tag, pace: u.pace }))
    ]);
  }

  async getVenueTagFrequencies() {
    const venues = await this.getAllVenues();
    const freq = {};
    for (const v of venues) {
      for (const tag of v.tags || []) {
        freq[tag] = (freq[tag] || 0) + 1;
      }
    }
    return freq;
  }

  async run() {
    const health = await this.healthCheck();
    if (!health.ok) {
      this.logger.warn('DATABASE saltado', health);
      return { status: 'skipped', output: health, errors: [] };
    }
    const [users, venues] = await Promise.all([this.getAllUsers(), this.getAllVenues()]);
    this.logger.info('DATABASE listo', { users: users.length, venues: venues.length });
    return {
      status: 'ok',
      output: { userCount: users.length, venueCount: venues.length },
      errors: []
    };
  }

  async shutdown() {
    if (this.prisma) {
      try { await this.prisma.$disconnect(); } catch { /* ignore */ }
    }
  }
}

module.exports = DatabaseAgent;

if (require.main === module) {
  (async () => {
    const agent = new DatabaseAgent({});
    await agent.initialize();
    const result = await agent.run();
    console.log(JSON.stringify(result, null, 2));
    await agent.shutdown();
  })();
}
