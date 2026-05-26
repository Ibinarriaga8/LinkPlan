const { Logger } = require('../shared/logger');

class TrendsAgent {
  constructor({ logger, deps } = {}) {
    this.logger = logger || new Logger({ agent: 'TRENDS' });
    this.db = deps?.DATABASE || null;
    this.lastAnalysis = null;
  }

  async initialize() {
    if (!this.db) this.logger.warn('TRENDS sin DATABASE inyectado; modo standalone');
  }

  computeTopTags(preferences, category) {
    const buckets = {};
    const usersByTag = {};
    for (const p of preferences) {
      if (p.category !== category) continue;
      buckets[p.tag] = (buckets[p.tag] || 0) + 1;
      usersByTag[p.tag] = usersByTag[p.tag] || new Set();
      usersByTag[p.tag].add(p.userId);
    }
    const totalUsers = new Set(preferences.map((p) => p.userId)).size || 1;
    return Object.entries(buckets)
      .map(([tag, count]) => {
        const userCount = usersByTag[tag].size;
        return { tag, score: +(userCount / totalUsers).toFixed(4), userCount, occurrences: count };
      })
      .sort((a, b) => b.score - a.score);
  }

  recommendVenues({ user, venues, limit = 5 }) {
    const userTags = new Set([...(user.foodTags || []), ...(user.activityTags || [])]);
    if (!userTags.size) return [];
    return venues
      .map((v) => {
        const matchedTags = (v.tags || []).filter((t) => userTags.has(t));
        return { venueId: v.id, score: matchedTags.length, matchedTags, price: v.price };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.price - b.price)
      .slice(0, limit);
  }

  async analyze({ preferences, venues, users } = {}) {
    preferences = preferences || (this.db ? await this.db.getAllPreferences() : []);
    venues = venues || (this.db ? await this.db.getAllVenues() : []);
    users = users || (this.db ? await this.db.getAllUsers() : []);

    const topFoodTags = this.computeTopTags(preferences, 'food');
    const topActivityTags = this.computeTopTags(preferences, 'activity');

    const recommendations = {};
    for (const u of users) {
      recommendations[u.id] = this.recommendVenues({ user: u, venues });
    }

    this.lastAnalysis = { topFoodTags, topActivityTags, recommendations };
    return this.lastAnalysis;
  }

  async run() {
    if (this.db) {
      const health = await this.db.healthCheck();
      if (!health.ok) {
        this.logger.warn('TRENDS skipped: BD no accesible');
        return { status: 'skipped', output: { reason: 'no-database' }, errors: [] };
      }
    }
    const analysis = await this.analyze();
    this.logger.info('Análisis completado', {
      foodTags: analysis.topFoodTags.length,
      activityTags: analysis.topActivityTags.length,
      usersConRecs: Object.keys(analysis.recommendations).length
    });
    return { status: 'ok', output: analysis, errors: [] };
  }
}

module.exports = TrendsAgent;
