import type { TimeOfDay } from '@/types';

type Pace = 'relajado' | 'moderado' | 'intenso';

// Cada plan dura ~1-2h. Con los factores de ritmo (0.8–1.25) la base de 90 min
// se mantiene siempre dentro de ese rango (intenso ≈ 1h10, relajado ≈ 1h55).
const SLOT_BASE_MIN = 90;
const PACE_FACTOR: Record<Pace, number> = { relajado: 1.25, moderado: 1, intenso: 0.8 };
const PACE_GAP: Record<Pace, number> = { relajado: 45, moderado: 30, intenso: 20 };

// Inicio (min desde 00:00) de cada hueco según el momento del día. Debe coincidir
// con las ventanas del backend (planService TIME_OF_DAY): comida 13:00, cena 20:00.
const WINDOW_START: Record<TimeOfDay, Record<'morning' | 'lunch' | 'afternoon', number>> = {
  manana: { morning: 630, lunch: 780, afternoon: 960 }, // 10:30 · 13:00 · 16:00
  mediodia: { lunch: 780, morning: 960, afternoon: 1110 }, // 13:00 · 16:00 · 18:30
  tarde: { morning: 1020, lunch: 1200, afternoon: 1320 }, // 17:00 · 20:00 · 22:00
  noche: { lunch: 1200, morning: 1320, afternoon: 1440 } // 20:00 · 22:00 · 00:00
};

export type TimelineItem = {
  slot: 'morning' | 'lunch' | 'afternoon';
  label: string;
  venueName: string;
  start: string;
  end: string;
  durationMin: number;
};

function fmt(totalMin: number): string {
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function roundTo5(n: number): number {
  return Math.round(n / 5) * 5;
}

function labelFor(startMin: number, isMeal: boolean): string {
  if (isMeal) return startMin < 1080 ? '🍽️ Comida' : '🍽️ Cena';
  if (startMin < 780) return '🌅 Mañana';
  if (startMin < 1230) return '☀️ Tarde';
  return '🌙 Noche';
}

export function buildTimeline(
  plan: {
    pace?: string;
    timeOfDay?: TimeOfDay | null;
    morning?: { name: string } | null;
    lunch: { name: string };
    afternoon?: { name: string } | null;
  },
  timeOfDay?: TimeOfDay | null
): { items: TimelineItem[]; totalMin: number } {
  const pace: Pace = (['relajado', 'moderado', 'intenso'] as const).includes(plan.pace as Pace)
    ? (plan.pace as Pace)
    : 'moderado';
  const factor = PACE_FACTOR[pace];
  const gap = PACE_GAP[pace];
  const tod: TimeOfDay = timeOfDay ?? plan.timeOfDay ?? 'mediodia';
  const starts = WINDOW_START[tod] ?? WINDOW_START.mediodia;

  const slots = [
    plan.morning ? { slot: 'morning' as const, venueName: plan.morning.name, isMeal: false, winStart: starts.morning } : null,
    { slot: 'lunch' as const, venueName: plan.lunch.name, isMeal: true, winStart: starts.lunch },
    plan.afternoon ? { slot: 'afternoon' as const, venueName: plan.afternoon.name, isMeal: false, winStart: starts.afternoon } : null
  ]
    .filter((s): s is NonNullable<typeof s> => Boolean(s))
    .sort((a, b) => a.winStart - b.winStart);

  let cursor = 0;
  let totalMin = 0;
  const items: TimelineItem[] = slots.map((s, i) => {
    const durationMin = roundTo5(SLOT_BASE_MIN * factor);
    const start = i === 0 ? s.winStart : Math.max(s.winStart, cursor + gap);
    const end = start + durationMin;
    cursor = end;
    totalMin += durationMin;
    return {
      slot: s.slot,
      label: labelFor(start, s.isMeal),
      venueName: s.venueName,
      start: fmt(start),
      end: fmt(end),
      durationMin
    };
  });

  return { items, totalMin };
}

export function formatDuration(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}
