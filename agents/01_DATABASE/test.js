const DatabaseAgent = require('./db-agent');

async function main() {
  const agent = new DatabaseAgent({});
  await agent.initialize();
  const health = await agent.healthCheck();

  if (health.ok) {
    const [users, venues] = await Promise.all([agent.getAllUsers(), agent.getAllVenues()]);
    console.log(`[OK] BD accesible (users=${users.length}, venues=${venues.length})`);
  } else {
    console.log(`[SKIPPED] BD no accesible: ${health.reason || 'unknown'}`);
  }

  await agent.shutdown();
  process.exit(0);
}

main().catch((err) => {
  console.error('DATABASE test ERROR:', err.message);
  process.exit(1);
});
