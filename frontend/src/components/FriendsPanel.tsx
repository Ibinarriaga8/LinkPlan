'use client';

import { useState } from 'react';
import type { User } from '@/types';

export function FriendsPanel({
  me,
  friends,
  allUsers,
  onToggleFriend
}: {
  me: User;
  friends: User[];
  allUsers: User[];
  onToggleFriend: (userId: string) => void;
}) {
  const [search, setSearch] = useState('');
  const friendIds = new Set(friends.map((f) => f.id));
  const candidates = allUsers.filter((u) => u.id !== me.id && u.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="animate-in space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mis amigos</h1>
        <p className="mt-1 text-sm text-[#5B6B82]">Añade gente para incluirla rápido en tus planes.</p>
      </div>

      <section className="rounded-2xl border border-[#D8E3F2] bg-white p-5">
        <h2 className="display text-lg font-semibold">Tus amigos ({friends.length})</h2>

        {friends.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {friends.map((f) => (
              <button
                key={f.id}
                onClick={() => onToggleFriend(f.id)}
                className="flex items-center gap-2 rounded-full border border-[#D8E3F2] bg-[#EAF1FB] px-3 py-1 text-sm transition hover:bg-red-50"
                title="Click para quitar"
              >
                <span className="inline-block h-4 w-4 rounded-full" style={{ backgroundColor: f.color }} />
                {f.name}
                <span className="text-xs text-red-500">×</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-xl bg-[#EAF1FB] p-3 text-sm text-[#5B6B82]">Aún no tienes amigos. Búscalos abajo para añadirlos.</p>
        )}

        <input
          className="mt-4 w-full rounded-xl border border-[#CFE0F3] p-2.5 text-sm outline-none transition focus:border-[#0E4DA4] focus:ring-2 focus:ring-[#0E4DA4]/15"
          placeholder="Buscar usuario para añadir…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {search ? (
          <div className="mt-2 max-h-72 space-y-1 overflow-auto">
            {candidates.length === 0 ? (
              <p className="text-xs text-[#5B6B82]">Nadie coincide.</p>
            ) : (
              candidates.map((u) => {
                const isFriend = friendIds.has(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => onToggleFriend(u.id)}
                    className="flex w-full items-center justify-between rounded-lg border border-[#D8E3F2] p-2 text-left text-sm transition hover:bg-[#EAF1FB]"
                  >
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: u.color }} />
                      {u.name}
                      {u.username ? <span className="text-xs text-[#5B6B82]">@{u.username}</span> : null}
                    </span>
                    <span className={`text-xs ${isFriend ? 'text-red-500' : 'text-[#0E4DA4]'}`}>
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
