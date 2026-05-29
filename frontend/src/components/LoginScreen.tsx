'use client';

import { useState } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { ADMIN_USER, ADMIN_USERNAME, setStoredAdminToken } from '@/lib/admin';
import type { User } from '@/types';

type Mode = 'idle' | 'register' | 'login' | 'admin';

export function LoginScreen() {
  const { setUser } = useAuth();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [adminPw, setAdminPw] = useState('');
  const [mode, setMode] = useState<Mode>('idle');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const normalized = username.trim().toLowerCase();

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (normalized.length < 3) {
      setError('El nombre de usuario debe tener al menos 3 caracteres.');
      return;
    }
    // El admin no usa passkey: se entra por contraseña.
    if (normalized === ADMIN_USERNAME) {
      setMode('admin');
      return;
    }
    setBusy(true);
    try {
      const options = await api.auth.loginOptions({ username: normalized });
      setMode('login');
      const response = await startAuthentication({ optionsJSON: options as Parameters<typeof startAuthentication>[0]['optionsJSON'] });
      const user = await api.auth.loginVerify({ username: normalized, response });
      setUser(user);
    } catch (err) {
      const e = err as Error & { status?: number };
      if (e.status === 404) {
        setMode('register');
        setBusy(false);
        return;
      }
      setError(e.message ?? 'No se pudo entrar.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (displayName.trim().length < 1) {
      setError('Pon tu nombre.');
      return;
    }
    setBusy(true);
    try {
      const options = await api.auth.registerOptions({ username: normalized, name: displayName.trim() });
      const response = await startRegistration({ optionsJSON: options as Parameters<typeof startRegistration>[0]['optionsJSON'] });
      const user: User = await api.auth.registerVerify({ username: normalized, name: displayName.trim(), response });
      setUser(user);
    } catch (err) {
      const e = err as Error;
      setError(e.message ?? 'No se pudo crear la cuenta.');
    } finally {
      setBusy(false);
    }
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { token } = await api.adminLogin(adminPw);
      setStoredAdminToken(token);
      setAdminPw('');
      setUser(ADMIN_USER);
    } catch (err) {
      setError((err as Error).message ?? 'Contraseña de administrador incorrecta.');
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    'mt-1.5 w-full rounded-2xl border border-hair bg-white px-4 py-3.5 text-[15px] text-ink outline-none transition placeholder:text-muted/70 focus:border-royal focus:ring-4 focus:ring-royal/10';
  const primaryBtn =
    'btn-shine flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3.5 text-sm font-semibold text-white shadow-glow transition hover:brightness-105 active:scale-[0.98] disabled:opacity-50';
  const ghostBtn = 'w-full rounded-2xl px-4 py-2.5 text-sm font-medium text-[#43577A] transition hover:text-navy';

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-10">
      {/* Glows de fondo */}
      <span className="pointer-events-none absolute -left-24 top-1/4 size-72 rounded-full bg-sky/25 blur-3xl animate-float-slow" />
      <span className="pointer-events-none absolute -right-20 bottom-10 size-80 rounded-full bg-royal/20 blur-3xl animate-glow-pulse" />

      <div className="relative w-full max-w-md animate-scale-in">
        <div className="overflow-hidden rounded-[28px] border border-white/70 shadow-card glass-strong">
          {/* Cabecera de marca */}
          <div className="azulejo-texture relative overflow-hidden bg-brand-deep px-8 pb-7 pt-9 text-center text-white">
            <span className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-white/10 blur-2xl" />
            <div className="relative mx-auto flex size-16 items-center justify-center rounded-3xl bg-white/95 p-2 shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo_vector.png" alt="Gatos y Cañas" className="h-full w-full object-contain" />
            </div>
            <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.28em] text-white/70">Gatos y Cañas</p>
            <h1 className="display mt-1 text-3xl">
              {mode === 'admin' ? 'Acceso admin' : mode === 'register' ? 'Crea tu cuenta' : 'Entra con tu huella'}
            </h1>
          </div>
          <div className="azulejo-cenefa" aria-hidden />

          <div className="p-7 sm:p-8">
            {mode !== 'admin' && mode !== 'register' ? (
              <p className="mb-6 text-center text-sm text-[#43577A]">
                Sin contraseñas. Sin emails. Tu dispositivo guarda una clave única que solo se desbloquea con tu huella, Face&nbsp;ID o PIN.
              </p>
            ) : null}

            {mode === 'admin' ? (
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <p className="rounded-2xl border border-hair bg-mist p-3.5 text-sm text-[#3A5378]">
                  🔒 Acceso de <strong className="text-navy">administrador</strong>. Introduce la contraseña.
                </p>
                <label className="block">
                  <span className="text-sm font-medium text-ink/80">Contraseña de administrador</span>
                  <input
                    type="password"
                    value={adminPw}
                    onChange={(e) => setAdminPw(e.target.value)}
                    placeholder="••••••••"
                    autoFocus
                    autoComplete="current-password"
                    className={inputCls}
                  />
                </label>
                <button type="submit" disabled={busy || !adminPw} className={primaryBtn}>
                  {busy ? 'Comprobando…' : 'Entrar como admin'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('idle');
                    setAdminPw('');
                    setError(null);
                  }}
                  className={ghostBtn}
                >
                  Volver
                </button>
              </form>
            ) : mode !== 'register' ? (
              <form onSubmit={handleContinue} className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-ink/80">Nombre de usuario</span>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ej: claudia"
                    autoFocus
                    autoComplete="username webauthn"
                    className={inputCls}
                  />
                </label>
                <button type="submit" disabled={busy} className={primaryBtn}>
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M12 11c-2 0-3.5 1.8-3.5 4M12 4a4 4 0 0 0-4 4v1.5M12 4a4 4 0 0 1 4 4c0 4-1 6-1 6M7 14c0 3 .5 5 .5 5M16.5 12.5c0 3.5-.8 6.5-.8 6.5" />
                  </svg>
                  {busy ? 'Conectando…' : 'Continuar'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <p className="rounded-2xl border border-hair bg-mist p-3.5 text-sm text-[#3A5378]">
                  <strong className="text-navy">{normalized}</strong> no existe todavía. Vamos a crear tu cuenta.
                </p>
                <label className="block">
                  <span className="text-sm font-medium text-ink/80">Tu nombre (para mostrar)</span>
                  <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Claudia" autoFocus className={inputCls} />
                </label>
                <button type="submit" disabled={busy} className={primaryBtn}>
                  {busy ? 'Creando…' : 'Crear cuenta con passkey'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('idle');
                    setDisplayName('');
                    setError(null);
                  }}
                  className={ghostBtn}
                >
                  Volver
                </button>
              </form>
            )}

            {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          </div>
        </div>
        <p className="mt-5 text-center text-xs text-[#7B8FB0]">Planes de ocio en Madrid · hecho para compartir</p>
      </div>
    </main>
  );
}
