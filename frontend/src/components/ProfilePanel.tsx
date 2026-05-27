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

export function ProfilePanel({
  me,
  friends,
  allUsers,
  onSave,
  onToggleFriend
}: {
  me: User;
  friends: User[];
  allUsers: User[];
  onSave: (patch: ProfilePatch) => void;
  onToggleFriend: (userId: string) => void;
}) {
  const [name, setName] = useState(me.name);
  const [description, setDescription] = useState(me.description ?? '');
  const [foodTags, setFoodTags] = useState<string[]>(me.foodTags);
  const [activityTags, setActivityTags] = useState<string[]>(me.activityTags);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setName(me.name);
    setDescription(me.description ?? '');
    setFoodTags(me.foodTags);
    setActivityTags(me.activityTags);
  }, [me.id, me.name, me.description, me.foodTags, me.activityTags]);

  const friendIds = new Set(friends.map((f) => f.id));
  const candidates = allUsers.filter((u) => u.id !== me.id && u.name.toLowerCase().includes(search.toLowerCase()));

  function toggle(value: string, selected: string[], setter: (next: string[]) => void) {
    setter(selected.includes(value) ? selected.filter((t) => t !== value) : [...selected, value]);
  }

  const dirty =
    name !== me.name ||
    description !== (me.description ?? '') ||
    JSON.stringify(foodTags.sort()) !== JSON.stringify([...me.foodTags].sort()) ||
    JSON.stringify(activityTags.sort()) !== JSON.stringify([...me.activityTags].sort());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mi Usuario</h1>
        <p className="mt-1 text-sm text-[#9A9390]">Configura cómo te ven los demás y elige tus gustos para que los planes te queden a medida.</p>
      </div>

      <section className="rounded-xl border border-[#EAE4D9] p-5">
        <div className="mb-4 flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold text-white"
            style={{ backgroundColor: me.color }}
          >
            {me.name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-[#B79B68]">@{me.username}</p>
            <p className="display text-xl">{name || 'Sin nombre'}</p>
          </div>
        </div>

        <label className="block text-sm">
          Nombre
          <input className="mt-1 w-full rounded-lg border p-2" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="mt-3 block text-sm">
          Descripción
          <textarea
            className="mt-1 w-full rounded-lg border p-2"
            rows={3}
            placeholder="Cuéntate en una frase…"
            maxLength={280}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <p className="mt-1 text-right text-xs text-[#9A9390]">{description.length}/280</p>
        </label>

        <p className="mt-4 mb-1 text-sm font-medium">Comida</p>
        <TagSelector tags={FOOD_TAGS} selected={foodTags} onToggle={(t) => toggle(t, foodTags, setFoodTags)} />

        <p className="mt-4 mb-1 text-sm font-medium">Actividades</p>
        <TagSelector tags={ACTIVITY_TAGS} selected={activityTags} onToggle={(t) => toggle(t, activityTags, setActivityTags)} />

        <div className="mt-5 flex justify-end gap-2">
          {dirty ? (
            <button
              className="rounded-lg border border-[#EAE4D9] px-4 py-2 text-sm"
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
            className="rounded-lg bg-[#1A1714] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Guardar cambios
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-[#EAE4D9] p-5">
        <h2 className="display text-lg font-semibold">Amigos ({friends.length})</h2>
        <p className="mt-1 text-xs text-[#9A9390]">Añade gente para incluirla rápido en tus planes.</p>

        {friends.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {friends.map((f) => (
              <button
                key={f.id}
                onClick={() => onToggleFriend(f.id)}
                className="flex items-center gap-2 rounded-full border border-[#EAE4D9] bg-[#FAF7F2] px-3 py-1 text-sm hover:bg-red-50"
                title="Click para quitar"
              >
                <span className="inline-block h-4 w-4 rounded-full" style={{ backgroundColor: f.color }} />
                {f.name}
                <span className="text-xs text-red-500">×</span>
              </button>
            ))}
          </div>
        ) : null}

        <input
          className="mt-4 w-full rounded-lg border p-2 text-sm"
          placeholder="Buscar usuario para añadir…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {search ? (
          <div className="mt-2 max-h-60 space-y-1 overflow-auto">
            {candidates.length === 0 ? (
              <p className="text-xs text-[#9A9390]">Nadie coincide.</p>
            ) : (
              candidates.map((u) => {
                const isFriend = friendIds.has(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => onToggleFriend(u.id)}
                    className="flex w-full items-center justify-between rounded-lg border border-[#EAE4D9] p-2 text-left text-sm hover:bg-[#FAF7F2]"
                  >
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: u.color }} />
                      {u.name}
                      {u.username ? <span className="text-xs text-[#9A9390]">@{u.username}</span> : null}
                    </span>
                    <span className={`text-xs ${isFriend ? 'text-red-500' : 'text-[#6B8F71]'}`}>
                      {isFriend ? 'Quitar' : '+ Añadir'}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
