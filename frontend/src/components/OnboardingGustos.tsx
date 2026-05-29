'use client';

import { useEffect, useRef, useState } from 'react';
import { TagSelector } from './TagSelector';
import { api } from '@/lib/api';
import type { TrendTag, User } from '@/types';

const FOOD_TAGS = [
  'tradicional', 'tapas', 'español', 'italiano', 'pizza', 'pasta', 'asiatico', 'japones', 'sushi',
  'mexicano', 'americano', 'hamburgesas', 'vegetariano', 'vegano', 'saludable', 'mediterraneo',
  'pescado', 'brunch', 'cafe', 'postres', 'rapido', 'vasco', 'pintxos', 'birras', 'copas'
];
const ACTIVITY_TAGS = [
  'arte', 'cultura', 'historia', 'monumentos', 'exposiciones', 'contemporaneo',
  'naturaleza', 'paseo', 'relax', 'fotografía', 'vistas', 'gastronomia',
  'fiestas', 'copas', 'birras', 'terraza', 'planes-noche', 'musica', 'conciertos',
  'mercadillos', 'adrenalina', 'deporte', 'grupos', 'diversión'
];
const PACE_OPTIONS = [
  { value: 'relajado', label: 'Relajado', hint: 'Tranqui, sin prisa', emoji: '🌿' },
  { value: 'moderado', label: 'Moderado', hint: 'Equilibrado', emoji: '⚖️' },
  { value: 'intenso', label: 'Intenso', hint: 'A tope, día completo', emoji: '🔥' }
] as const;

type Pace = (typeof PACE_OPTIONS)[number]['value'];

export function OnboardingGustos({
  me,
  onComplete
}: {
  me: User;
  onComplete: (patch: { foodTags: string[]; activityTags: string[]; pace: Pace }) => Promise<void>;
}) {
  const [foodTags, setFoodTags] = useState<string[]>(me.foodTags ?? []);
  const [activityTags, setActivityTags] = useState<string[]>(me.activityTags ?? []);
  const [pace, setPace] = useState<Pace>(me.pace ?? 'moderado');
  const [trending, setTrending] = useState<TrendTag[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preselected = useRef(false);

  useEffect(() => {
    let cancelled = false;
    api
      .trendingCategories(3)
      .then((data) => {
        if (cancelled) return;
        setTrending(data.top);
        if (!preselected.current && (me.foodTags?.length ?? 0) === 0 && (me.activityTags?.length ?? 0) === 0) {
          preselected.current = true;
          const food = data.top.filter((t) => t.kind === 'food').map((t) => t.tag);
          const activity = data.top.filter((t) => t.kind === 'activity').map((t) => t.tag);
          if (food.length) setFoodTags(food);
          if (activity.length) setActivityTags(activity);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [me.foodTags, me.activityTags]);

  function toggle(value: string, list: string[], setter: (next: string[]) => void) {
    setter(list.includes(value) ? list.filter((t) => t !== value) : [...list, value]);
  }

  function toggleTrending(t: TrendTag) {
    if (t.kind === 'food') toggle(t.tag, foodTags, setFoodTags);
    else toggle(t.tag, activityTags, setActivityTags);
  }

  function isTrendingSelected(t: TrendTag) {
    return t.kind === 'food' ? foodTags.includes(t.tag) : activityTags.includes(t.tag);
  }

  const valid = foodTags.length > 0 || activityTags.length > 0;
  const picks = foodTags.length + activityTags.length;

  async function handleSubmit() {
    if (!valid) {
      setError('Elige al menos un gusto para que los planes te encajen.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onComplete({ foodTags, activityTags, pace });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar tus gustos.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 sm:py-12">
      <span className="pointer-events-none absolute -right-24 top-10 size-72 rounded-full bg-sky/20 blur-3xl animate-float-slow" />
      <div className="relative mx-auto max-w-2xl animate-fade-up">
        {/* Cabecera */}
        <div className="overflow-hidden rounded-t-4xl border border-white/70 bg-brand-deep px-7 pb-7 pt-9 text-white shadow-card">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/70">Bienvenida, {me.name}</p>
          <h1 className="display mt-1 text-3xl sm:text-4xl">Cuéntanos tus gustos</h1>
          <p className="mt-2 max-w-md text-sm text-white/80">
            Usaremos esto para proponerte planes a tu medida. Puedes cambiarlos cuando quieras desde tu perfil.
          </p>
        </div>

        <div className="rounded-b-4xl border border-t-0 border-hair bg-white p-6 shadow-card sm:p-7">
          {trending.length > 0 ? (
            <section className="mb-6 rounded-2xl border border-royal/15 bg-mist p-4">
              <p className="text-sm font-semibold text-navy">🔥 Tendencia en Madrid ahora</p>
              <p className="mt-1 text-xs text-[#43577A]">Las preseleccionamos por ti. Quita o añade lo que quieras.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {trending.map((t) => {
                  const active = isTrendingSelected(t);
                  return (
                    <button
                      key={`${t.kind}-${t.tag}`}
                      type="button"
                      onClick={() => toggleTrending(t)}
                      className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition active:scale-95 ${
                        active ? 'border-royal bg-royal text-white shadow-soft' : 'border-hair bg-white text-navy hover:border-royal'
                      }`}
                    >
                      {active ? '✓ ' : '+ '}
                      {t.tag}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="mb-6">
            <p className="mb-2 text-sm font-semibold text-ink">🍽️ Comida que te gusta</p>
            <TagSelector tags={FOOD_TAGS} selected={foodTags} onToggle={(t) => toggle(t, foodTags, setFoodTags)} />
          </section>

          <section className="mb-6">
            <p className="mb-2 text-sm font-semibold text-ink">🎟️ Planes y actividades</p>
            <TagSelector tags={ACTIVITY_TAGS} selected={activityTags} onToggle={(t) => toggle(t, activityTags, setActivityTags)} />
          </section>

          <section className="mb-6">
            <p className="mb-2 text-sm font-semibold text-ink">⚡ Tu ritmo</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {PACE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPace(opt.value)}
                  className={`rounded-2xl border p-3.5 text-left transition active:scale-95 ${
                    pace === opt.value ? 'border-navy bg-navy text-white shadow-soft' : 'border-hair hover:border-royal hover:bg-mist'
                  }`}
                >
                  <p className="text-base font-semibold">{opt.emoji} {opt.label}</p>
                  <p className={`text-xs ${pace === opt.value ? 'text-white/70' : 'text-muted'}`}>{opt.hint}</p>
                </button>
              ))}
            </div>
          </section>

          {error ? <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

          <button
            type="button"
            disabled={busy || !valid}
            onClick={() => void handleSubmit()}
            className="btn-shine flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3.5 text-sm font-semibold text-white shadow-glow transition hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? 'Guardando…' : `Empezar a planear${picks > 0 ? ` · ${picks} gusto${picks === 1 ? '' : 's'}` : ''}`}
          </button>
        </div>
      </div>
    </main>
  );
}
