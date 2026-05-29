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

function resolveNewsService(root) {
  const p = path.join(root, 'backend', 'src', 'services', 'newsService.js');
  return fs.existsSync(p) ? p : null;
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

  loadNewsService() {
    if (this._newsService !== undefined) return this._newsService;
    const p = resolveNewsService(this.root);
    try {
      this._newsService = p ? require(p) : null;
    } catch (err) {
      this.logger.warn('No se pudo cargar newsService', { error: err.message });
      this._newsService = null;
    }
    return this._newsService;
  }

  // Inserta/actualiza venues (idempotente por id). Devuelve cuántos se crean vs actualizan.
  async upsertVenues(venues = []) {
    if (!this.connected || !venues.length) return { incorporated: 0, updated: 0 };
    let incorporated = 0;
    let updated = 0;
    for (const v of venues) {
      try {
        const existing = await this.prisma.venue.findUnique({ where: { id: v.id }, select: { id: true } });
        await this.prisma.venue.upsert({ where: { id: v.id }, update: v, create: v });
        if (existing) updated += 1;
        else incorporated += 1;
      } catch (err) {
        this.logger.warn('No se pudo incorporar venue', { id: v.id, error: err.message });
      }
    }
    return { incorporated, updated };
  }

  // Descubre lugares en las fuentes de tendencias y los incorpora a la BBDD.
  async incorporateTrendingVenues() {
    const news = this.loadNewsService();
    if (!news || typeof news.getDiscoveredVenues !== 'function') {
      return { discovered: 0, incorporated: 0, updated: 0, reason: 'news-service-unavailable' };
    }
    let discovered = [];
    try {
      discovered = await news.getDiscoveredVenues();
    } catch (err) {
      this.logger.warn('Fallo al descubrir venues', { error: err.message });
      return { discovered: 0, incorporated: 0, updated: 0, reason: 'discovery-failed' };
    }
    const result = await this.upsertVenues(discovered);
    this.logger.info('Venues incorporados desde tendencias', { discovered: discovered.length, ...result });
    return { discovered: discovered.length, ...result };
  }

  async run() {
    const health = await this.healthCheck();
    if (!health.ok) {
      this.logger.warn('DATABASE saltado', health);
      return { status: 'skipped', output: health, errors: [] };
    }
    const incorporation = await this.incorporateTrendingVenues();
    const [users, venues] = await Promise.all([this.getAllUsers(), this.getAllVenues()]);
    this.logger.info('DATABASE listo', { users: users.length, venues: venues.length, incorporated: incorporation.incorporated });
    return {
      status: 'ok',
      output: { userCount: users.length, venueCount: venues.length, incorporation },
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
