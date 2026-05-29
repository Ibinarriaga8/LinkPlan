'use client';

import { useCallback, useEffect, useState } from 'react';

// Anuncio que aparece tras un tiempo usando la app y se puede cerrar.
// delayMs es configurable (por defecto 2 minutos) para poder previsualizarlo.
export function AdPopup({ delayMs = 120000 }: { delayMs?: number }) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    const t = setTimeout(() => setOpen(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs, dismissed]);

  const close = useCallback(() => {
    setOpen(false);
    setDismissed(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4 animate-fade-in" role="dialog" aria-modal="true" aria-label="Anuncio">
      {/* Backdrop: pulsar fuera cierra */}
      <button aria-label="Cerrar anuncio" onClick={close} className="absolute inset-0 cursor-default bg-navy/55 backdrop-blur-sm" />

      <div className="relative w-full max-w-sm overflow-hidden rounded-4xl bg-white shadow-card animate-pop">
        <span className="absolute left-3 top-3 z-10 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
          Anuncio
        </span>
        <button
          onClick={close}
          aria-label="Cerrar"
          className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/75 active:scale-90"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/100mon.jpg" alt="100 Montaditos" className="h-44 w-full object-cover" />

        <div className="space-y-3 p-6 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-royal">Solo hoy · al usar esta app</p>
          <h2 className="display text-2xl leading-tight text-navy">
            100 Montaditos <span className="text-royal">2×1</span>
          </h2>
          <p className="text-sm text-muted">
            <strong className="text-ink">¡No te lo pierdas!</strong> Oferta exclusiva por usar Gatos y Cañas.
          </p>
          <a
            href="https://spain.100montaditos.com"
            target="_blank"
            rel="noreferrer"
            onClick={close}
            className="btn-shine block w-full rounded-2xl bg-brand px-4 py-3.5 text-sm font-semibold text-white shadow-glow transition hover:brightness-105 active:scale-[0.98]"
          >
            ¡Lo quiero!
          </a>
          <button onClick={close} className="text-xs font-medium text-muted transition hover:text-navy">
            No, gracias
          </button>
        </div>
      </div>
    </div>
  );
}
