const test = require('node:test');
const assert = require('node:assert/strict');
const { generatePlan, parseSchedule, venueOpenForWindow, weekdayOf } = require('../src/services/planService');

const organizer = { id: 'u1', foodTags: ['tapas'], activityTags: ['arte'], pace: 'moderado' };
const companions = [{ id: 'u2', foodTags: ['vegetariano'], activityTags: ['naturaleza'], pace: 'relajado' }];
const restaurants = [
  { id: 'r1', tags: ['tapas'], zone: 'Centro', price: 20, available: true },
  { id: 'r2', tags: ['vegetariano'], zone: 'Retiro', price: 18, available: true }
];
const activities = [
  { id: 'a1', tags: ['arte'], zone: 'Centro', price: 12, available: true },
  { id: 'a2', tags: ['naturaleza'], zone: 'Retiro', price: 0, available: true }
];

function build(duration) {
  return generatePlan({
    organizer,
    companions,
    budgetPerPerson: 50,
    date: '2026-05-27',
    zone: 'Centro',
    restaurants,
    activities,
    duration
  });
}

test('corto genera solo la comida (1 plan)', () => {
  const plan = build('corto');
  assert.equal(plan.totalPeople, 2);
  assert.equal(plan.totalBudget, 100);
  assert.ok(plan.lunch);
  assert.equal(plan.morning, null);
  assert.equal(plan.afternoon, null);
  assert.equal(plan.totalCost, plan.lunch.price * 2);
});

test('medio genera actividad + comida (2 planes)', () => {
  const plan = build('medio');
  assert.ok(plan.morning);
  assert.ok(plan.lunch);
  assert.equal(plan.afternoon, null);
  assert.equal(plan.totalCost, (plan.morning.price + plan.lunch.price) * 2);
});

test('largo genera actividad + comida + actividad (3 planes)', () => {
  const plan = build('largo');
  assert.ok(plan.morning);
  assert.ok(plan.lunch);
  assert.ok(plan.afternoon);
  assert.notEqual(plan.morning.id, plan.afternoon.id);
  assert.equal(plan.totalCost, (plan.morning.price + plan.lunch.price + plan.afternoon.price) * 2);
});

// --- Horarios ---------------------------------------------------------------
test('parseSchedule entiende días y franjas que cruzan medianoche', () => {
  const rastro = parseSchedule('dom 09:00-15:00');
  assert.deepEqual([...rastro.days], [0]);
  assert.deepEqual(rastro.intervals, [{ s: 540, e: 900 }]);

  const noche = parseSchedule('20:00-02:00');
  assert.equal(noche.days, null);
  assert.deepEqual(noche.intervals, [{ s: 1200, e: 1560 }]); // 02:00 -> +1440

  const cerradoLunes = parseSchedule('10:00-21:00 (lun cerrado)');
  assert.ok(!cerradoLunes.days.has(1));
  assert.ok(cerradoLunes.days.has(0));

  const finde = parseSchedule('sab-dom 11:00-22:00');
  assert.deepEqual([...finde.days].sort(), [0, 6]);

  const siempre = parseSchedule('24h');
  assert.equal(siempre.days, null);
});

test('El Rastro (dom) solo abre los domingos', () => {
  const domingo = weekdayOf('2026-05-31'); // domingo
  const sabado = weekdayOf('2026-05-30'); // sábado
  assert.equal(venueOpenForWindow('dom 09:00-15:00', domingo, [630, 780]), true);
  assert.equal(venueOpenForWindow('dom 09:00-15:00', sabado, [630, 780]), false);
});

test('una discoteca de noche no abre por la mañana pero sí de noche', () => {
  const joy = '00:30-06:00';
  assert.equal(venueOpenForWindow(joy, null, [630, 780]), false); // mañana
  assert.equal(venueOpenForWindow(joy, null, [1320, 1800]), true); // banda de noche
});

const todRestaurants = [
  { id: 'rc', name: 'Solo Comida', tags: ['tapas'], zone: 'Centro', price: 20, available: true, schedule: '13:00-16:00' },
  { id: 'rn', name: 'Solo Cena', tags: ['tapas'], zone: 'Centro', price: 22, available: true, schedule: '20:00-23:30' }
];
const todActivities = [
  { id: 'am', name: 'Museo', tags: ['arte'], zone: 'Centro', price: 10, available: true, schedule: '10:00-20:00' },
  { id: 'an', name: 'Copas', tags: ['copas'], zone: 'Centro', price: 12, available: true, schedule: '18:00-02:00' }
];

function buildTod(timeOfDay, duration = 'corto') {
  return generatePlan({
    organizer,
    companions: [],
    budgetPerPerson: 80,
    date: '2026-05-29', // viernes
    zone: 'Centro',
    timeOfDay,
    duration,
    restaurants: todRestaurants,
    activities: todActivities
  });
}

test('mediodía elige un restaurante abierto a la hora de comer', () => {
  const plan = buildTod('mediodia');
  assert.equal(plan.lunch.id, 'rc');
  assert.equal(plan.timeOfDay, 'mediodia');
});

test('noche elige un restaurante abierto para cenar', () => {
  const plan = buildTod('noche');
  assert.equal(plan.lunch.id, 'rn');
});

test('noche acompaña la cena con un plan de noche, no un museo de día', () => {
  const plan = buildTod('noche', 'medio');
  assert.equal(plan.lunch.id, 'rn');
  assert.equal(plan.morning.id, 'an');
});
