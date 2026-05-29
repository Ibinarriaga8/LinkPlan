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

  return (
    <div className="animate-in space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mi perfil</h1>
        <p className="mt-1 text-sm text-[#5B6B82]">Configura cómo te ven los demás y elige tus gustos para que los planes te queden a medida.</p>
      </div>

      <section className="rounded-2xl border border-[#D8E3F2] bg-white p-5">
        <div className="mb-4 flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold text-white shadow-sm"
            style={{ backgroundColor: me.color }}
          >
            {me.name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-[#2F6FBF]">@{me.username}</p>
            <p className="display text-xl">{name || 'Sin nombre'}</p>
          </div>
        </div>

        <label className="block text-sm">
          Nombre
          <input className="mt-1 w-full rounded-xl border border-[#CFE0F3] p-2.5 outline-none transition focus:border-[#0E4DA4] focus:ring-2 focus:ring-[#0E4DA4]/15" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="mt-3 block text-sm">
          Descripción
          <textarea
            className="mt-1 w-full rounded-xl border border-[#CFE0F3] p-2.5 outline-none transition focus:border-[#0E4DA4] focus:ring-2 focus:ring-[#0E4DA4]/15"
            rows={3}
            placeholder="Cuéntate en una frase…"
            maxLength={280}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <p className="mt-1 text-right text-xs text-[#5B6B82]">{description.length}/280</p>
        </label>

        <p className="mt-4 mb-1 text-sm font-medium">Comida</p>
        <TagSelector tags={FOOD_TAGS} selected={foodTags} onToggle={(t) => toggle(t, foodTags, setFoodTags)} />

        <p className="mt-4 mb-1 text-sm font-medium">Actividades</p>
        <TagSelector tags={ACTIVITY_TAGS} selected={activityTags} onToggle={(t) => toggle(t, activityTags, setActivityTags)} />

        <div className="mt-5 flex justify-end gap-2">
          {dirty ? (
            <button
              className="rounded-lg border border-[#D8E3F2] px-4 py-2 text-sm"
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
            className="rounded-lg bg-[#0E4DA4] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Guardar cambios
          </button>
        </div>
      </section>

      <div className="flex justify-end border-t border-[#D8E3F2] pt-4">
        <button
          onClick={() => void onLogout()}
          className="rounded-lg border border-[#D8E3F2] px-4 py-2 text-sm text-[#43577A] transition hover:bg-[#EAF1FB] hover:text-[#0E4DA4]"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
