// --- Horarios y días de apertura -------------------------------------------
// Las venues guardan su horario como texto libre, p.ej.:
//   "13:00-16:00, 20:00-00:00"        · comida y cena
//   "dom 09:00-15:00"                 · El Rastro: solo domingos
//   "sab-dom 11:00-22:00"             · mercadillos de finde
//   "10:00-21:00 (lun cerrado)"       · museos cerrados los lunes
//   "00:30-06:00" / "21:00-02:00"     · locales de noche (cruzan medianoche)
// Parseamos ese texto a { days, intervals } para poder filtrar por momento del día.

const DAY = { dom: 0, lun: 1, mar: 2, mie: 3, mié: 3, jue: 4, vie: 5, sab: 6, sáb: 6 };
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function expandDayRange(a, b) {
  const out = [];
  let d = a;
  for (let i = 0; i < 7; i += 1) {
    out.push(d);
    if (d === b) break;
    d = (d + 1) % 7;
  }
  return out;
}

// days: Set de días (0=domingo) o null = todos · intervals: minutos desde 00:00,
// con fin > 1440 cuando el horario cruza medianoche (p.ej. 20:00-02:00).
function parseSchedule(schedule) {
  const str = (schedule || '').toLowerCase().trim();
  if (!str || str.includes('24h')) return { days: null, intervals: [{ s: 0, e: 1440 }] };

  let days = null;
  const closed = str.match(/\(([a-zé]{3,4})\s+cerrado\)/);
  if (closed && DAY[closed[1]] !== undefined) {
    days = new Set(ALL_DAYS.filter((d) => d !== DAY[closed[1]]));
  }
  const range = str.match(/^([a-zé]{3,4})\s*-\s*([a-zé]{3,4})/);
  const single = str.match(/^([a-zé]{3,4})\s+\d/);
  if (range && DAY[range[1]] !== undefined && DAY[range[2]] !== undefined) {
    days = new Set(expandDayRange(DAY[range[1]], DAY[range[2]]));
  } else if (single && DAY[single[1]] !== undefined) {
    days = new Set([DAY[single[1]]]);
  }

  const intervals = [];
  const re = /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/g;
  let m;
  while ((m = re.exec(str))) {
    const s = Number(m[1]) * 60 + Number(m[2]);
    let e = Number(m[3]) * 60 + Number(m[4]);
    if (e <= s) e += 1440; // cruza medianoche
    intervals.push({ s, e });
  }
  if (intervals.length === 0) intervals.push({ s: 0, e: 1440 });
  return { days, intervals };
}

function overlaps(a1, a2, b1, b2) {
  return a1 < b2 && b1 < a2;
}

// ¿La venue está abierta y solapa con la ventana [winStart, winEnd] del momento
// elegido, en el día de la semana de la fecha del plan?
function venueOpenForWindow(schedule, weekday, [winStart, winEnd]) {
  const parsed = parseSchedule(schedule);
  if (parsed.days && weekday !== null && !parsed.days.has(weekday)) return false;
  return parsed.intervals.some(
    ({ s, e }) => overlaps(s, e, winStart, winEnd) || overlaps(s + 1440, e + 1440, winStart, winEnd)
  );
}

function weekdayOf(date) {
  if (!date || typeof date !== 'string') return null;
  const [y, mo, d] = date.split('-').map(Number);
  if (!y || !mo || !d) return null;
  return new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
}

// --- Momentos del día -------------------------------------------------------
// Cada momento define qué comida toca (comida/cena) y la ventana horaria de
// cada hueco (antes/comida/después). Las ventanas garantizan horas con sentido:
// comida 13:00-16:00, cena 20:00-23:30, y los locales de noche solo de noche.
const TIME_OF_DAY = {
  manana: {
    meal: 'comida',
    windows: { morning: [630, 780], lunch: [780, 960], afternoon: [960, 1110] }
  },
  mediodia: {
    meal: 'comida',
    windows: { lunch: [780, 960], morning: [960, 1110], afternoon: [1110, 1260] }
  },
  tarde: {
    meal: 'cena',
    windows: { morning: [1020, 1170], lunch: [1200, 1410], afternoon: [1320, 1800] }
  },
  noche: {
    meal: 'cena',
    windows: { lunch: [1200, 1410], morning: [1320, 1800], afternoon: [1320, 1800] }
  }
};

function resolveTimeOfDay(timeOfDay) {
  return TIME_OF_DAY[timeOfDay] ? timeOfDay : 'mediodia';
}

// --- Puntuación y variedad --------------------------------------------------
function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeSeed(...parts) {
  return hashStr(parts.join('|'));
}

// Jitter determinista en [0, magnitude): mismo (seed, id) → mismo valor, pero
// distintas zonas/fechas/horarios barajan el orden y dan variedad real.
function jitter(seed, id, magnitude = 1.6) {
  return (hashStr(`${seed}|${id}`) % 1000) / 1000 * magnitude;
}

function scorePlace(place, tags = [], zone = '') {
  const tagScore = place.tags.filter((tag) => tags.some((u) => u === tag || u.includes(tag) || tag.includes(u))).length;
  const zoneBonus = zone && place.zone.includes(zone) ? 3 : 0;
  return tagScore + zoneBonus;
}

function pickPace(users) {
  const paceCounts = { relajado: 0, moderado: 0, intenso: 0 };
  users.forEach((u) => {
    if (paceCounts[u.pace] !== undefined) paceCounts[u.pace] += 1;
  });
  return Object.entries(paceCounts).sort((a, b) => b[1] - a[1])[0][0] ?? 'moderado';
}

// Cada "plan" dura ~1-2h. La duración decide cuántos planes (sitios) entran:
// corto = 1 (comida) · medio = 2 (actividad + comida) · largo = 3 (actividad + comida + actividad).
function slotsForDuration(duration) {
  if (duration === 'corto') return { morning: false, afternoon: false };
  if (duration === 'largo') return { morning: true, afternoon: true };
  return { morning: true, afternoon: false };
}

function generatePlan({
  organizer,
  companions,
  budgetPerPerson,
  date,
  zone,
  restaurants,
  activities,
  duration = 'medio',
  timeOfDay = 'mediodia',
  excludeIds = [],
  variantSeed = 0
}) {
  const allUsers = [organizer, ...companions];
  if (!organizer || allUsers.length === 0) {
    throw new Error('Organizer is required');
  }

  const totalPeople = allUsers.length;
  const totalBudget = budgetPerPerson * totalPeople;
  const mergedFood = [...new Set(allUsers.flatMap((u) => u.foodTags))];
  const mergedActivities = [...new Set(allUsers.flatMap((u) => u.activityTags))];
  const pace = pickPace(allUsers);
  const excludeSet = new Set(excludeIds);

  const tod = resolveTimeOfDay(timeOfDay);
  const windows = TIME_OF_DAY[tod].windows;
  const weekday = weekdayOf(date);

  // Semilla: en la primera generación deriva de zona/fecha/momento/presupuesto
  // para que cada combinación dé un plan distinto; en "otra opción" usa variantSeed.
  const seed = variantSeed || makeSeed(date || '', zone || '', tod, String(budgetPerPerson));

  const rankRestaurants = (window) =>
    restaurants
      .filter((r) => r.available && r.price <= budgetPerPerson && !excludeSet.has(r.id))
      .filter((r) => venueOpenForWindow(r.schedule, weekday, window))
      .map((r) => ({ ...r, score: scorePlace(r, mergedFood, zone) + jitter(seed, r.id) }))
      .sort((a, b) => b.score - a.score || a.price - b.price);

  const rankActivities = (window) => {
    let ranked = activities
      .filter((a) => a.available && a.price <= budgetPerPerson && !excludeSet.has(a.id))
      .filter((a) => venueOpenForWindow(a.schedule, weekday, window))
      .map((a) => ({ ...a, score: scorePlace(a, mergedActivities, zone) + jitter(seed, a.id) }))
      .sort((a, b) => b.score - a.score || a.price - b.price);
    if (pace === 'intenso') ranked = ranked.filter((a) => !a.tags.includes('relax'));
    if (pace === 'relajado') {
      ranked = [...ranked].sort(
        (a, b) => (a.tags.includes('adrenalina') ? 1 : 0) - (b.tags.includes('adrenalina') ? 1 : 0)
      );
    }
    return ranked;
  };

  // La zona es un filtro DURO y total: si la eliges, TODOS los sitios del plan
  // están exactamente en esa zona. Nunca mezclamos zonas ni te mandamos a la otra
  // punta de Madrid. Si un hueco no tiene sitio en la zona, se queda vacío antes
  // que rellenarse con otra zona; si ni la comida cabe, avisamos (más abajo).
  // Sin zona, no se filtra nada.
  const wantZone = (zone || '').trim().toLowerCase();
  const zoneRespected = true; // garantizado: jamás salimos de la zona elegida
  const inZone = (list) => {
    if (!wantZone) return list;
    return list.filter((v) => (v.zone || '').trim().toLowerCase() === wantZone);
  };

  const { morning: wantsMorning, afternoon: wantsAfternoon } = slotsForDuration(duration);
  const candidateLunches = inZone(rankRestaurants(windows.lunch)).slice(0, 14);
  const candidateMorning = wantsMorning ? inZone(rankActivities(windows.morning)).slice(0, 14) : [];
  const candidateAfternoon = wantsAfternoon ? inZone(rankActivities(windows.afternoon)).slice(0, 14) : [];

  if (candidateLunches.length === 0) {
    if (wantZone) {
      throw new Error(`No hay sitios en la zona "${zone}" para ese momento del día con ese presupuesto. Prueba otra zona, otra hora o sube el presupuesto.`);
    }
    throw new Error('No hay restaurantes abiertos para ese momento del día con ese presupuesto. Prueba otra hora, zona o sube el presupuesto.');
  }

  let best = null;
  const consider = (morning, lunch, afternoon) => {
    const perPerson = (morning?.price ?? 0) + lunch.price + (afternoon?.price ?? 0);
    if (perPerson > budgetPerPerson) return;
    const score = (morning?.score ?? 0) + lunch.score + (afternoon?.score ?? 0);
    if (!best || score > best.score || (score === best.score && perPerson < best.perPerson)) {
      best = { morning: morning ?? null, lunch, afternoon: afternoon ?? null, score, perPerson };
    }
  };

  for (const l of candidateLunches) {
    if (!wantsMorning) {
      consider(null, l, null);
      continue;
    }
    for (const m of candidateMorning) {
      if (!wantsAfternoon) {
        consider(m, l, null);
        continue;
      }
      for (const a of candidateAfternoon) {
        if (a.id === m.id) continue;
        consider(m, l, a);
      }
    }
  }

  // Degradación elegante: si no hay dos actividades distintas (p.ej. la zona solo
  // tiene una), damos actividad + comida antes que caer a comida sola.
  if (!best && wantsAfternoon) {
    for (const l of candidateLunches) for (const m of candidateMorning) consider(m, l, null);
  }
  // Si aun así no cabe ninguna actividad en el presupuesto, al menos la comida.
  if (!best && wantsMorning) {
    for (const l of candidateLunches) consider(null, l, null);
  }

  if (!best) {
    throw new Error('No hay combinación posible dentro del presupuesto. Sube el presupuesto o relaja los filtros.');
  }

  const { morning, lunch, afternoon, perPerson } = best;
  const totalCost = perPerson * totalPeople;
  const remainingBudget = totalBudget - totalCost;

  return {
    date,
    zone,
    zoneRespected,
    pace,
    duration,
    timeOfDay: tod,
    organizer,
    companions,
    allUsers,
    totalPeople,
    budgetPerPerson,
    totalBudget,
    totalCost,
    remainingBudget,
    mergedFood,
    mergedActivities,
    morning,
    lunch,
    afternoon
  };
}

module.exports = { generatePlan, scorePlace, pickPace, parseSchedule, venueOpenForWindow, weekdayOf, TIME_OF_DAY };
