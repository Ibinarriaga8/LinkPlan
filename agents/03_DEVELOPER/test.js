const DeveloperAgent = require('./dev-agent');

async function main() {
  const agent = new DeveloperAgent({});
  await agent.initialize();

  const result = await agent.run({
    endpoints: [
      { name: 'createFeedback', method: 'POST', path: '/api/feedback', model: 'feedback',
        fields: [{ name: 'userId' }, { name: 'message' }] }
    ],
    components: [
      { name: 'FeedbackCard', props: [{ name: 'title' }, { name: 'rating', type: 'number' }] }
    ]
  });

  const checks = [
    ['endpoint generado', result.output.endpoints[0]?.file],
    ['endpoint syntax válida', result.output.endpoints[0]?.valid === true],
    ['componente generado', result.output.components[0]?.file],
    ['sin errores', result.errors.length === 0]
  ];

  let allOk = true;
  for (const [name, ok] of checks) {
    console.log(`[${ok ? 'OK' : 'FAIL'}] ${name}`);
    if (!ok) allOk = false;
  }
  console.log(allOk ? '\nDEVELOPER test OK' : '\nDEVELOPER test FAILED');
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error('DEVELOPER test ERROR:', err.message);
  process.exit(1);
});
