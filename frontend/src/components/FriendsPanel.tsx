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
    <div className="space-y-6">
      <div className="flex items-start gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand text-white shadow-glow">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" />
          </svg>
        </span>
        <div>
          <p className="eyebrow">Tu gente</p>
          <h1 className="display text-[26px] leading-[1.1] text-navy sm:text-[32px]">Mis amigos</h1>
          <p className="mt-1 text-sm text-muted">Añade gente para incluirla rápido en tus planes.</p>
        </div>
      </div>

      <section className="card p-5 sm:p-6 animate-fade-up">
        <h2 className="display text-lg font-semibold text-navy">Tus amigos ({friends.length})</h2>

        {friends.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {friends.map((f) => (
              <button
                key={f.id}
                onClick={() => onToggleFriend(f.id)}
                className="group flex items-center gap-2 rounded-full border border-hair bg-mist py-1 pl-1 pr-3 text-sm font-medium transition hover:border-red-300 hover:bg-red-50 active:scale-95"
                title="Click para quitar"
              >
                <span className="grid size-6 place-items-center rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: f.color }}>
                  {f.name.slice(0, 1).toUpperCase()}
                </span>
                {f.name}
                <span className="text-xs text-red-400 transition group-hover:text-red-600">×</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-2xl bg-mist p-3.5 text-sm text-muted">Aún no tienes amigos. Búscalos abajo para añadirlos.</p>
        )}

        <div className="relative mt-5">
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            className="w-full rounded-2xl border border-hair bg-white py-3 pl-10 pr-3 text-sm outline-none transition focus:border-royal focus:ring-4 focus:ring-royal/10"
            placeholder="Buscar usuario para añadir…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {search ? (
          <div className="mt-2 max-h-72 space-y-1.5 overflow-auto thin-scroll">
            {candidates.length === 0 ? (
              <p className="px-1 py-2 text-xs text-muted">Nadie coincide.</p>
            ) : (
              candidates.map((u) => {
                const isFriend = friendIds.has(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => onToggleFriend(u.id)}
                    className="flex w-full items-center justify-between rounded-2xl border border-hair p-2.5 text-left text-sm transition hover:border-royal hover:bg-mist active:scale-[0.99]"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="grid size-7 place-items-center rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: u.color }}>
                        {u.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="font-medium text-ink">{u.name}</span>
                      {u.username ? <span className="text-xs text-muted">@{u.username}</span> : null}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isFriend ? 'bg-red-50 text-red-500' : 'bg-royal/10 text-royal'}`}>
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
