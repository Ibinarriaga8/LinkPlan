const TrendsAgent = require('./trends-agent');

const preferences = [
  { userId: 'u1', category: 'food', tag: 'tapas' },
  { userId: 'u1', category: 'food', tag: 'vegano' },
  { userId: 'u1', category: 'activity', tag: 'museo' },
  { userId: 'u2', category: 'food', tag: 'tapas' },
  { userId: 'u2', category: 'activity', tag: 'cine' },
  { userId: 'u3', category: 'food', tag: 'tapas' },
  { userId: 'u3', category: 'activity', tag: 'museo' }
];

const venues = [
  { id: 'v1', name: 'Bar Tapas', tags: ['tapas', 'vegano'], price: 15, type: 'RESTAURANT' },
  { id: 'v2', name: 'Museo Reina Sofía', tags: ['museo', 'arte'], price: 12, type: 'ACTIVITY' },
  { id: 'v3', name: 'Cine Doré', tags: ['cine'], price: 8, type: 'ACTIVITY' }
];

const users = [
  { id: 'u1', foodTags: ['tapas', 'vegano'], activityTags: ['museo'] },
  { id: 'u2', foodTags: ['tapas'], activityTags: ['cine'] },
  { id: 'u3', foodTags: ['tapas'], activityTags: ['museo'] }
];

async function main() {
  const agent = new TrendsAgent({});
  await agent.initialize();
  const result = await agent.analyze({ preferences, venues, users });

  const checks = [];
  checks.push(['topFoodTags incluye tapas como #1', result.topFoodTags[0]?.tag === 'tapas']);
  checks.push(['topActivityTags no vacío', result.topActivityTags.length > 0]);
  checks.push(['u1 recibe recomendaciones', (result.recommendations.u1 || []).length > 0]);
  checks.push(['u1 → Bar Tapas matchea 2 tags', result.recommendations.u1?.[0]?.score === 2]);

  let allOk = true;
  for (const [name, ok] of checks) {
    console.log(`[${ok ? 'OK' : 'FAIL'}] ${name}`);
    if (!ok) allOk = false;
  }
  console.log(allOk ? '\nTRENDS test OK' : '\nTRENDS test FAILED');
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error('TRENDS test ERROR:', err.message);
  process.exit(1);
});
