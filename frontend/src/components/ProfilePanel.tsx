'use client';

import { useEffect, useState } from 'react';
import { TagSelector } from './TagSelector';
import type { User } from '@/types';

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

type ProfilePatch = Partial<Pick<User, 'name' | 'description' | 'foodTags' | 'activityTags'>>;

export function ProfilePanel({ me, onSave, onLogout }: { me: User; onSave: (patch: ProfilePatch) => void; onLogout: () => void | Promise<void> }) {
  const [name, setName] = useState(me.name);
  const [description, setDescription] = useState(me.description ?? '');
  const [foodTags, setFoodTags] = useState<string[]>(me.foodTags);
  const [activityTags, setActivityTags] = useState<string[]>(me.activityTags);

  useEffect(() => {
    setName(me.name);
    setDescription(me.description ?? '');
    setFoodTags(me.foodTags);
    setActivityTags(me.activityTags);
  }, [me.id, me.name, me.description, me.foodTags, me.activityTags]);

  function toggle(value: string, selected: string[], setter: (next: string[]) => void) {
    setter(selected.includes(value) ? selected.filter((t) => t !== value) : [...selected, value]);
  }

  const dirty =
    name !== me.name ||
    description !== (me.description ?? '') ||
    JSON.stringify([...foodTags].sort()) !== JSON.stringify([...me.foodTags].sort()) ||
    JSON.stringify([...activityTags].sort()) !== JSON.stringify([...me.activityTags].sort());

  const inputCls =
    'mt-1.5 w-full rounded-2xl border border-hair bg-white px-3.5 py-3 text-[15px] text-ink outline-none transition placeholder:text-muted/70 focus:border-royal focus:ring-4 focus:ring-royal/10';

  return (
    <div className="space-y-6">
      {/* Hero perfil con degradado de marca */}
      <section className="azulejo-texture relative overflow-hidden rounded-4xl border border-hair bg-brand-deep p-6 text-white shadow-card animate-fade-up sm:p-8">
        <span className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full bg-white/10 blur-2xl animate-glow-pulse" />
        <div className="relative flex items-center gap-4">
          <div
            className="grid size-16 shrink-0 place-items-center rounded-3xl text-2xl font-bold text-white shadow-glow ring-4 ring-white/25"
            style={{ backgroundColor: me.color }}
          >
            {me.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/70">@{me.username}</p>
            <p className="display truncate text-2xl sm:text-3xl">{name || 'Sin nombre'}</p>
            {me.description ? <p className="mt-0.5 line-clamp-2 text-sm text-white/80">{me.description}</p> : null}
          </div>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <label className="block text-sm font-medium text-ink/80">
          Nombre
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="mt-4 block text-sm font-medium text-ink/80">
          Descripción
          <textarea
            className={inputCls}
            rows={3}
            placeholder="Cuéntate en una frase…"
            maxLength={280}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <span className="mt-1 block text-right text-xs text-muted">{description.length}/280</span>
        </label>

        <p className="mb-2 mt-6 text-sm font-semibold text-ink">🍽️ Comida</p>
        <TagSelector tags={FOOD_TAGS} selected={foodTags} onToggle={(t) => toggle(t, foodTags, setFoodTags)} />

        <p className="mb-2 mt-6 text-sm font-semibold text-ink">🎟️ Actividades</p>
        <TagSelector tags={ACTIVITY_TAGS} selected={activityTags} onToggle={(t) => toggle(t, activityTags, setActivityTags)} />

        <div className="mt-6 flex justify-end gap-2">
          {dirty ? (
            <button
              className="rounded-2xl border border-hair px-4 py-2.5 text-sm font-medium transition hover:bg-mist active:scale-95"
              onClick={() => {
                setName(me.name);
                setDescription(me.description ?? '');
                setFoodTags(me.foodTags);
                setActivityTags(me.activityTags);
              }}
            >
              Descartar
            </button>
          ) : null}
          <button
            disabled={!dirty}
            onClick={() => onSave({ name, description: description || null, foodTags, activityTags })}
            className="rounded-2xl bg-royal px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:brightness-110 active:scale-95 disabled:opacity-40"
          >
            Guardar cambios
          </button>
        </div>
      </section>

      <div className="flex justify-end border-t border-hair pt-4">
        <button
          onClick={() => void onLogout()}
          className="rounded-2xl border border-hair px-4 py-2.5 text-sm font-medium text-[#43577A] transition hover:bg-mist hover:text-royal active:scale-95"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
