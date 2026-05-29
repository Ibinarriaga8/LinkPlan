// Normaliza las zonas de las venues en la BBDD.
//
// El problema: al incorporar venues desde tendencias acabamos con zonas
// duplicadas o con variantes de nombre ("Latina" vs "La Latina",
// "Moncloa-Aravaca" vs "Moncloa - Aravaca", ...) y con venues sin zona. Eso
// rompe el filtro por zona del generador de planes (cada variante es una zona
// distinta) y ensucia el desplegable.
//
// Este script fusiona cada variante en su nombre canónico. Lo más relevante:
// "Latina" -> "La Latina", que mete esas actividades en una zona que SÍ tiene
// restaurantes, así que pasan a ser usables en planes reales.
//
// Uso:  node scripts/normalize-venue-zones.js        (aplica los cambios)
//       node scripts/normalize-venue-zones.js --dry  (solo muestra qué haría)

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// alias (lo que hay en BBDD)  ->  zona canónica
const CANONICAL = {
  Latina: 'La Latina',
  'Moncloa-Aravaca': 'Moncloa - Aravaca',
  'Fuencarral-El Pardo': 'Fuencarral - El Pardo',
  'San Blas-Canillejas': 'San Blas - Canillejas',
  'Usera - Pte de Vallecas': 'Usera',
  LAB: '' // basura: se queda sin zona (no aparecerá en el desplegable)
};

function canonicalZone(zone) {
  const z = (zone || '').trim();
  if (Object.prototype.hasOwnProperty.call(CANONICAL, z)) return CANONICAL[z];
  return z;
}

async function main() {
  const dryRun = process.argv.includes('--dry');
  const venues = await prisma.venue.findMany({ select: { id: true, zone: true } });

  const changes = [];
  for (const v of venues) {
    const next = canonicalZone(v.zone);
    if (next !== (v.zone || '').trim() || next !== v.zone) {
      if (next !== v.zone) changes.push({ id: v.id, from: v.zone, to: next });
    }
  }

  if (changes.length === 0) {
    console.log('Nada que normalizar: las zonas ya están limpias.');
    return;
  }

  const summary = changes.reduce((acc, c) => {
    const key = `"${c.from ?? ''}" -> "${c.to}"`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  console.log(`${changes.length} venues a normalizar:`);
  for (const [k, n] of Object.entries(summary)) console.log(`  ${n.toString().padStart(3)}  ${k}`);

  if (dryRun) {
    console.log('\n(--dry) No se ha aplicado ningún cambio.');
    return;
  }

  for (const c of changes) {
    await prisma.venue.update({ where: { id: c.id }, data: { zone: c.to } });
  }
  console.log(`\nHecho: ${changes.length} venues actualizadas.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
