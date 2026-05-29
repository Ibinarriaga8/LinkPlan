'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { LoginScreen } from '@/components/LoginScreen';
import { ProfilePanel } from '@/components/ProfilePanel';
import { FriendsPanel } from '@/components/FriendsPanel';
import { OnboardingGustos } from '@/components/OnboardingGustos';
import { useAuth } from '@/lib/authContext';
import { ADMIN_USER_ID, getStoredAdminToken, setStoredAdminToken } from '@/lib/admin';
import { buildTimeline, formatDuration } from '@/lib/timeline';
import type { AdminOverview, Plan, PlanSuggestion, PlanSuggestions, StoredPlan, TimeOfDay, TrendingEvent, User, Venue } from '@/types';

const DURATIONS = [
  { value: 'corto', label: 'Corto · 1 plan (~1-2h)' },
  { value: 'medio', label: 'Medio · 2 planes (~2-4h)' },
  { value: 'largo', label: 'Largo · 3 planes (~4-6h)' }
] as const;
const TIMES_OF_DAY = [
  { value: 'manana', label: '🌅 Mañana · actividad + comida (13:00)' },
  { value: 'mediodia', label: '🍽️ Mediodía · comida (13:00) + tarde' },
  { value: 'tarde', label: '☀️ Tarde · actividad + cena (20:00)' },
  { value: 'noche', label: '🌙 Noche · cena (20:00) + copas' }
] as const;
type Tab = 'perfil' | 'amigos' | 'planes' | 'generar' | 'sitios' | 'news' | 'admin';

// ---------------------------------------------------------------------------
// Iconografía (line-icons, currentColor) — capa puramente visual.
// ---------------------------------------------------------------------------
type IconName =
  | 'user' | 'users' | 'calendar' | 'sparkles' | 'pin' | 'flame' | 'lock'
  | 'logout' | 'search' | 'check' | 'plus' | 'chevron' | 'heart' | 'heart-fill'
  | 'arrow-ur' | 'x' | 'map' | 'ticket' | 'wand' | 'star';

function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  const p = (d: string) => <path d={d} />;
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const paths: Record<IconName, React.ReactNode> = {
    user: <>{p('M20 21a8 8 0 0 0-16 0')}<circle cx="12" cy="7" r="4" /></>,
    users: <>{p('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2')}<circle cx="9" cy="7" r="4" />{p('M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11')}</>,
    calendar: <><rect x="3" y="4.5" width="18" height="16" rx="3" />{p('M3 9.5h18M8 2.5v4M16 2.5v4')}</>,
    sparkles: <>{p('M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9z')}{p('M19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z')}</>,
    wand: <>{p('M15 4V2M15 10v-2M11 6H9M21 6h-2M18.5 3.5l-1 1M18.5 8.5l-1-1')}{p('M3 21l12-12 2 2L5 23z')}</>,
    pin: <>{p('M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z')}<circle cx="12" cy="10" r="3" /></>,
    map: <>{p('M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14')}</>,
    flame: <>{p('M12 2c1 3 4 4.5 4 8a4 4 0 0 1-8 0c0-1 .3-1.8.7-2.4C7 9 6 11 6 13.5A6 6 0 0 0 18 13.5C18 8.5 14 6 12 2z')}</>,
    lock: <><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />{p('M8 10.5V7a4 4 0 0 1 8 0v3.5')}</>,
    logout: <>{p('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9')}</>,
    search: <><circle cx="11" cy="11" r="7" />{p('M21 21l-4.3-4.3')}</>,
    check: <>{p('M20 6 9 17l-5-5')}</>,
    plus: <>{p('M12 5v14M5 12h14')}</>,
    chevron: <>{p('M6 9l6 6 6-6')}</>,
    heart: <>{p('M19.5 5.5a5 5 0 0 0-7.5.5 5 5 0 0 0-7.5-.5C2 7.5 2.5 11 6 14l6 6 6-6c3.5-3 4-6.5 1.5-8.5z')}</>,
    'heart-fill': <path fill="currentColor" stroke="none" d="M19.5 5.5a5 5 0 0 0-7.5.5 5 5 0 0 0-7.5-.5C2 7.5 2.5 11 6 14l6 6 6-6c3.5-3 4-6.5 1.5-8.5z" />,
    'arrow-ur': <>{p('M7 17 17 7M8 7h9v9')}</>,
    x: <>{p('M18 6 6 18M6 6l12 12')}</>,
    ticket: <>{p('M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4zM13 6v12')}</>,
    star: <path fill="currentColor" stroke="none" d="M12 3l2.5 5.5L20 9.3l-4 4 1 5.7-5-2.8-5 2.8 1-5.7-4-4 5.5-.8z" />
  };
  return (
    <svg viewBox="0 0 24 24" className={className} {...common} aria-hidden>
      {paths[name]}
    </svg>
  );
}

function SectionHeader({ eyebrow, title, subtitle, icon }: { eyebrow: string; title: string; subtitle?: string; icon: IconName }) {
  return (
    <div className="flex items-start gap-3.5">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand text-white shadow-glow">
        <Icon name={icon} />
      </span>
      <div className="min-w-0">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display text-[26px] leading-[1.1] text-navy sm:text-[32px]">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
    </div>
  );
}

export default function Home() {
  const { user: authUser, loading: authLoading, logout, setUser } = useAuth();

  if (authLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
        <div className="relative flex h-24 w-24 items-center justify-center rounded-[28px] bg-white p-2.5 shadow-card">
          <span className="absolute inset-0 -z-10 rounded-[34px] bg-brand opacity-30 blur-2xl animate-glow-pulse" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo_vector.png" alt="Gatos y Cañas" className="h-full w-full object-contain" />
        </div>
        <div className="text-center">
          <p className="eyebrow">Gatos y Cañas</p>
          <p className="mt-1 display text-lg text-navy">Preparando tu sesión…</p>
        </div>
        <div className="h-1 w-40 overflow-hidden rounded-full bg-hair">
          <div className="h-full w-1/2 animate-loader bg-royal" />
        </div>
      </main>
    );
  }

  if (!authUser) return <LoginScreen />;

  const needsOnboarding = (authUser.foodTags?.length ?? 0) === 0 && (authUser.activityTags?.length ?? 0) === 0;
  if (needsOnboarding) {
    return (
      <OnboardingGustos
        me={authUser}
        onComplete={async (patch) => {
          const updated = await api.updateMe(patch);
          setUser(updated);
        }}
      />
    );
  }

  return <App authUser={authUser} onLogout={logout} />;
}

function App({ authUser, onLogout }: { authUser: User; onLogout: () => Promise<void> }) {
  const isAdmin = authUser.id === ADMIN_USER_ID;
  const [users, setUsers] = useState<User[]>([]);
  const [myPlans, setMyPlans] = useState<StoredPlan[]>([]);
  const [suggestions, setSuggestions] = useState<Record<string, PlanSuggestion[]>>({});
  const [news, setNews] = useState<TrendingEvent[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsLoaded, setNewsLoaded] = useState(false);
  const [newsError, setNewsError] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [favorites, setFavorites] = useState<Venue[]>([]);
  const [siteSearch, setSiteSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<Tab>(isAdmin ? 'admin' : 'perfil');
  const [friends, setFriends] = useState<User[]>([]);
  const [me, setMe] = useState<User>(authUser);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [duration, setDuration] = useState<'corto' | 'medio' | 'largo'>('medio');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('mediodia');
  const contentRef = useRef<HTMLElement>(null);

  const [adminToken, setAdminToken] = useState<string | null>(() => getStoredAdminToken());
  const [adminOverview, setAdminOverview] = useState<AdminOverview | null>(null);
  const [adminPw, setAdminPw] = useState('');
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminMsg, setAdminMsg] = useState<string | null>(null);

  async function adminLogin() {
    setAdminBusy(true);
    setAdminError(null);
    try {
      const { token } = await api.adminLogin(adminPw);
      setAdminToken(token);
      setAdminPw('');
      setAdminOverview(await api.adminOverview(token));
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'No se pudo entrar');
    } finally {
      setAdminBusy(false);
    }
  }

  async function incorporateVenues() {
    if (!adminToken) return;
    setAdminBusy(true);
    setAdminMsg(null);
    setAdminError(null);
    try {
      const r = await api.adminIncorporateVenues(adminToken);
      setAdminMsg(`Descubiertos ${r.discovered} · nuevos ${r.incorporated} · actualizados ${r.updated}`);
      setAdminOverview(await api.adminOverview(adminToken));
      await refresh();
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'No se pudo incorporar');
    } finally {
      setAdminBusy(false);
    }
  }

  function selectTab(key: Tab) {
    setActive(key);
    // En móvil el menú flota; subimos suavemente al inicio del contenido.
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
      requestAnimationFrame(() => contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }

  const [companionIds, setCompanionIds] = useState<string[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [budget, setBudget] = useState(50);
  const [zone, setZone] = useState('');

  const companions = useMemo(() => friends, [friends]);
  const favoriteIds = useMemo(() => new Set(favorites.map((v) => v.id)), [favorites]);
  // Todo plan necesita una comida (restaurante), así que solo ofrecemos zonas
  // que tienen al menos un restaurante: así la zona elegida SIEMPRE da un plan y
  // nunca acabas con "no hay sitios" ni te mandamos a la otra punta de Madrid.
  const availableZones = useMemo(
    () =>
      Array.from(
        new Set(
          venues
            .filter((v) => v.type === 'RESTAURANT')
            .map((v) => v.zone?.trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, 'es')),
    [venues]
  );
  // El campo permite vaciarse mientras se escribe (budget = NaN); aquí lo saneamos
  // al rango válido [10, 500] que exige el backend antes de enviarlo.
  const safeBudget = Number.isFinite(budget) && budget > 0 ? Math.min(500, Math.max(10, budget)) : 50;

  const refresh = useCallback(async () => {
    if (isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [usersData, adminData, mine, friendsData, sugg, favs] = await Promise.all([
        api.users(),
        api.adminData(),
        api.myPlans().catch(() => []),
        api.friends().catch(() => []),
        api.planSuggestions().catch(() => [] as PlanSuggestions[]),
        api.favorites().catch(() => [] as Venue[])
      ]);
      setUsers(usersData);
      setVenues([...adminData.restaurants, ...adminData.activities]);
      setMyPlans(mine);
      setFriends(friendsData);
      setFavorites(favs);
      setSuggestions(Object.fromEntries(sugg.map((s) => [s.planId, s.suggestions])));
      const refreshedMe = usersData.find((u) => u.id === authUser.id);
      if (refreshedMe) setMe(refreshedMe);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }, [authUser.id, isAdmin]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // En modo admin cargamos el panel directamente con el token guardado al entrar.
  useEffect(() => {
    if (!adminToken || adminOverview) return;
    let cancelled = false;
    api
      .adminOverview(adminToken)
      .then((data) => {
        if (!cancelled) setAdminOverview(data);
      })
      .catch(() => {
        // Token caducado/ inválido: forzamos re-login limpiando el estado de admin.
        if (cancelled) return;
        setStoredAdminToken(null);
        setAdminToken(null);
        if (isAdmin) void onLogout();
      });
    return () => {
      cancelled = true;
    };
  }, [adminToken, adminOverview, isAdmin, onLogout]);

  useEffect(() => {
    if (active !== 'news' || newsLoaded || newsLoading) return;
    setNewsLoading(true);
    setNewsError(false);
    api
      .trendingNews(15)
      .then((data) => {
        setNews(data.items ?? []);
        if (data.error) setNewsError(true);
      })
      .catch(() => setNewsError(true))
      .finally(() => {
        setNewsLoading(false);
        setNewsLoaded(true);
      });
  }, [active, newsLoaded, newsLoading]);

  function toggleTag(value: string, selected: string[], setter: (next: string[]) => void) {
    setter(selected.includes(value) ? selected.filter((t) => t !== value) : [...selected, value]);
  }

  async function toggleFavorite(venueId: string) {
    setError(null);
    const wasFav = favoriteIds.has(venueId);
    try {
      if (wasFav) await api.removeFavorite(venueId);
      else await api.addFavorite(venueId);
      const next = await api.favorites();
      setFavorites(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar tus sitios');
    }
  }

  async function createPlan(opts?: { excludeIds?: string[] }) {
    setSaving(true);
    setError(null);
    try {
      const nextPlan = await api.generatePlan({
        organizerId: authUser.id,
        companionIds,
        budgetPerPerson: safeBudget,
        date,
        zone,
        duration,
        timeOfDay,
        excludeIds: opts?.excludeIds,
        variantSeed: opts?.excludeIds ? Date.now() % 1000 : 0
      });
      setPlan(nextPlan);
      setActive('generar');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el plan');
    } finally {
      setSaving(false);
    }
  }

  async function regeneratePlan() {
    if (!plan) return;
    const excludeIds = [plan.morning?.id, plan.lunch.id, plan.afternoon?.id].filter((id): id is string => Boolean(id));
    await createPlan({ excludeIds });
  }

  async function deletePlan(id: string) {
    if (!confirm('¿Borrar este plan?')) return;
    await api.deletePlan(id);
    if (expandedPlanId === id) setExpandedPlanId(null);
    await refresh();
  }

  async function completePlan(id: string) {
    await api.completePlan(id);
    await refresh();
  }

  async function changePlanDate(id: string, newDate: string) {
    await api.updatePlan(id, { date: newDate });
    await refresh();
  }

  async function applySuggestion(planId: string, s: PlanSuggestion) {
    setError(null);
    try {
      await api.swapVenue(planId, s.slot, s.alternativeVenueId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo aplicar la sugerencia');
    }
  }

  async function saveProfile(patch: Partial<Pick<User, 'name' | 'description' | 'foodTags' | 'activityTags'>>) {
    const updated = await api.updateMe(patch);
    setMe(updated);
    await refresh();
  }

  async function toggleFriend(userId: string) {
    const isFriend = friends.some((f) => f.id === userId);
    if (isFriend) await api.removeFriend(userId);
    else await api.addFriend(userId);
    const next = await api.friends();
    setFriends(next);
  }

  async function savePlan() {
    if (!plan) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await api.confirmPlan({
        companionIds,
        budgetPerPerson: safeBudget,
        date,
        zone,
        duration,
        timeOfDay,
        morningVenueId: plan.morning?.id ?? null,
        lunchVenueId: plan.lunch.id,
        afternoonVenueId: plan.afternoon?.id ?? null
      });
      await refresh();
      setPlan(null);
      setExpandedPlanId(saved.id);
      setActive('planes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo confirmar el plan');
    } finally {
      setSaving(false);
    }
  }

  async function reservePlan(id: string) {
    setError(null);
    try {
      await api.confirmReservation(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reservar el plan');
    }
  }

  const inputCls =
    'mt-1.5 w-full rounded-2xl border border-hair bg-white px-3.5 py-3 text-[15px] text-ink outline-none transition placeholder:text-muted/70 focus:border-royal focus:ring-4 focus:ring-royal/10';
  const fieldLabel = 'block text-sm font-medium text-ink/80';

  const filteredVenues = venues.filter((v) => {
    if (!siteSearch.trim()) return true;
    const q = siteSearch.toLowerCase();
    return v.name.toLowerCase().includes(q) || v.zone.toLowerCase().includes(q) || v.tags.some((t) => t.includes(q));
  });

  function VenueRow({ v }: { v: Venue }) {
    const fav = favoriteIds.has(v.id);
    return (
      <div className="group flex items-center gap-3 rounded-3xl border border-hair bg-white p-3.5 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:border-sky hover:shadow-card">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-mist text-royal transition group-hover:bg-brand group-hover:text-white">
          <Icon name={v.type === 'RESTAURANT' ? 'map' : 'ticket'} />
        </span>
        <a href={v.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
          <p className="flex items-center gap-1 truncate font-semibold text-ink">
            {v.name}
            <Icon name="arrow-ur" className="h-3.5 w-3.5 shrink-0 text-muted opacity-0 transition group-hover:opacity-100" />
          </p>
          <p className="truncate text-xs text-muted">
            {v.zone} · <span className="font-medium text-ink/70">{v.price === 0 ? 'Gratis' : `${v.price}€`}</span>
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {v.tags.slice(0, 4).map((t) => (
              <span key={t} className="rounded-full bg-mist px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#3A5378]">{t}</span>
            ))}
          </div>
        </a>
        <button
          type="button"
          onClick={() => void toggleFavorite(v.id)}
          title={fav ? 'Quitar de mis sitios' : 'Guardar en mis sitios'}
          aria-pressed={fav}
          className={`grid size-10 shrink-0 place-items-center rounded-full transition active:scale-90 ${
            fav ? 'bg-royal/10 text-royal' : 'text-[#B7C6DD] hover:bg-mist hover:text-royal'
          }`}
        >
          <Icon name={fav ? 'heart-fill' : 'heart'} className={fav ? 'h-5 w-5 animate-pop' : 'h-5 w-5'} />
        </button>
      </div>
    );
  }

  // Navegación: barra inferior (móvil, con FAB central) + nav superior (desktop).
  const bottomNav: { key: Tab; label: string; icon: IconName; primary?: boolean }[] = [
    { key: 'perfil', label: 'Perfil', icon: 'user' },
    { key: 'amigos', label: 'Amigos', icon: 'users' },
    { key: 'generar', label: 'Crear', icon: 'sparkles', primary: true },
    { key: 'planes', label: 'Planes', icon: 'calendar' },
    { key: 'sitios', label: 'Sitios', icon: 'pin' }
  ];
  const desktopNav: { key: Tab; label: string; icon: IconName }[] = [
    { key: 'perfil', label: 'Perfil', icon: 'user' },
    { key: 'amigos', label: 'Amigos', icon: 'users' },
    { key: 'generar', label: 'Crear', icon: 'sparkles' },
    { key: 'planes', label: 'Planes', icon: 'calendar' },
    { key: 'sitios', label: 'Sitios', icon: 'pin' },
    { key: 'news', label: 'Noticias', icon: 'flame' }
  ];
  const initial = (authUser.name?.slice(0, 1) || '?').toUpperCase();

  return (
    <div className="min-h-screen">
      {/* ---------------- Top bar (sticky, glass) ---------------- */}
      <header className="sticky top-0 z-40 border-b border-white/60 glass">
        <div className="mx-auto flex h-[60px] max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button onClick={() => selectTab(isAdmin ? 'admin' : 'perfil')} className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo_vector.png" alt="Gatos y Cañas" className="h-9 w-9 rounded-xl object-contain drop-shadow-[0_4px_10px_rgba(10,46,110,0.2)]" />
            <span className="display text-lg font-semibold tracking-tight text-navy">Gatos y Cañas</span>
          </button>

          {/* Nav horizontal — solo desktop */}
          {!isAdmin ? (
            <nav className="ml-4 hidden flex-1 items-center justify-center gap-1 lg:flex">
              {desktopNav.map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => selectTab(key)}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition active:scale-95 ${
                    active === key ? 'bg-navy text-white shadow-soft' : 'text-[#43577A] hover:bg-mist'
                  }`}
                >
                  <Icon name={icon} className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </nav>
          ) : (
            <div className="flex-1" />
          )}

          <div className="ml-auto flex items-center gap-2">
            {!isAdmin ? (
              <button
                onClick={() => selectTab('news')}
                aria-label="Noticias"
                className={`grid size-10 place-items-center rounded-full transition active:scale-90 lg:hidden ${
                  active === 'news' ? 'bg-brand text-white shadow-glow' : 'text-royal hover:bg-mist'
                }`}
              >
                <Icon name="flame" />
              </button>
            ) : null}
            <button
              onClick={() => selectTab(isAdmin ? 'admin' : 'perfil')}
              aria-label="Mi perfil"
              className="flex items-center gap-2 rounded-full p-0.5 pr-0.5 transition active:scale-95 sm:pr-2.5 sm:hover:bg-mist"
            >
              <span
                className="grid size-9 place-items-center rounded-full text-sm font-bold text-white shadow-soft ring-2 ring-white"
                style={{ backgroundColor: authUser.color }}
              >
                {initial}
              </span>
              <span className="hidden text-sm font-semibold text-ink sm:block">{authUser.name}</span>
            </button>
            {isAdmin ? (
              <button
                onClick={() => {
                  setStoredAdminToken(null);
                  setAdminToken(null);
                  setAdminOverview(null);
                  setAdminMsg(null);
                  void onLogout();
                }}
                aria-label="Salir"
                className="grid size-10 place-items-center rounded-full text-[#43577A] transition hover:bg-mist active:scale-90"
              >
                <Icon name="logout" />
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {/* ---------------- Contenido ---------------- */}
      <main ref={contentRef} className="app-scroll mx-auto w-full max-w-6xl scroll-mt-20 px-4 pt-5 sm:px-6 lg:px-8 lg:pt-8">
        {error ? (
          <p className="mb-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-700 animate-slide-down">
            <Icon name="x" className="h-4 w-4 shrink-0" /> {error}
          </p>
        ) : null}
        {loading ? (
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div className="skeleton h-24 rounded-3xl" />
            <div className="skeleton h-24 rounded-3xl" />
          </div>
        ) : null}

        {active === 'perfil' ? <ProfilePanel me={me} onSave={(patch) => void saveProfile(patch)} onLogout={onLogout} /> : null}

        {active === 'amigos' ? (
          <FriendsPanel me={me} friends={friends} allUsers={users} onToggleFriend={(uid) => void toggleFriend(uid)} />
        ) : null}

        {active === 'generar' ? (
          <div className="space-y-6">
            <SectionHeader eyebrow="Planazo a medida" title="Generar plan" subtitle="Configura, genera y confirma un itinerario hecho para vosotros." icon="sparkles" />
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="card space-y-4 p-5 sm:p-6 animate-fade-up">
                <div className="rounded-2xl border border-royal/15 bg-mist px-4 py-3 text-xs text-[#3A5378]">
                  Organizado por <strong className="text-navy">{authUser.name}</strong> (tú) · elige acompañantes abajo
                </div>
                <label className={fieldLabel}>
                  Fecha
                  <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
                </label>
                <label className={fieldLabel}>
                  Presupuesto por persona (€)
                  <input
                    type="number"
                    min={10}
                    max={500}
                    step={5}
                    className={inputCls}
                    value={Number.isFinite(budget) ? budget : ''}
                    onChange={(e) => setBudget(e.target.value === '' ? NaN : Number(e.target.value))}
                    onBlur={(e) => {
                      const n = Number(e.target.value);
                      setBudget(Number.isFinite(n) && n > 0 ? Math.min(500, Math.max(10, n)) : 50);
                    }}
                  />
                </label>
                <label className={fieldLabel}>
                  Momento del día
                  <select className={inputCls} value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value as TimeOfDay)}>
                    {TIMES_OF_DAY.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </label>
                <label className={fieldLabel}>
                  Zona
                  <select className={inputCls} value={zone} onChange={(e) => setZone(e.target.value)}>
                    <option value="">Sin preferencia</option>
                    {availableZones.map((z) => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </label>
                <label className={fieldLabel}>
                  Duración
                  <select className={inputCls} value={duration} onChange={(e) => setDuration(e.target.value as typeof duration)}>
                    {DURATIONS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </label>
                <div>
                  <p className={`${fieldLabel} mb-2`}>Acompañantes</p>
                  {companions.length === 0 ? (
                    <p className="rounded-2xl bg-mist p-3.5 text-xs text-muted">
                      Solo puedes invitar a tus amigos. Añade amigos en <strong className="text-navy">Mis amigos</strong> para incluirlos aquí.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {companions.map((u) => {
                        const picked = companionIds.includes(u.id);
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => toggleTag(u.id, companionIds, setCompanionIds)}
                            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition active:scale-95 ${
                              picked ? 'border-navy bg-navy text-white shadow-soft' : 'border-hair hover:border-royal hover:text-royal'
                            }`}
                          >
                            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: u.color }} />
                            {u.name}
                            {picked ? <Icon name="check" className="h-3.5 w-3.5" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <button
                  disabled={saving}
                  className="btn-shine flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3.5 text-sm font-semibold text-white shadow-glow transition hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
                  onClick={() => void createPlan()}
                >
                  <Icon name="wand" className="h-5 w-5" />
                  {saving ? 'Generando…' : 'Generar plan'}
                </button>
              </div>

              <div className="card overflow-hidden p-5 sm:p-6">
                {!plan ? (
                  <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-3xl border border-dashed border-[#C7D8EE] bg-gradient-to-b from-mist/60 to-white p-8 text-center">
                    <span className="grid size-16 place-items-center rounded-3xl bg-white text-royal shadow-soft animate-float-slow">
                      <Icon name="map" className="h-8 w-8" />
                    </span>
                    <p className="mt-4 display text-lg text-navy">Tu itinerario aparecerá aquí</p>
                    <p className="mt-1 text-sm text-muted">Configura el plan a la izquierda y pulsa Generar.</p>
                  </div>
                ) : (
                  <div className="space-y-4 text-sm animate-scale-in">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="display text-xl text-navy">Plan para {plan.allUsers.map((u) => u.name).join(' & ')}</h3>
                      <span className="rounded-full bg-mist px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-royal">Borrador</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { k: 'pp', label: 'Por cabeza', value: `${(plan.totalCost / plan.totalPeople).toFixed(0)}€` },
                        { k: 'total', label: 'Total', value: `${plan.totalCost.toFixed(0)}€` },
                        { k: 'rem', label: 'Sobran', value: `${plan.remainingBudget.toFixed(0)}€` }
                      ].map((s) => (
                        <div key={s.k} className="rounded-2xl bg-mist p-3 text-center">
                          <p className="display text-xl text-navy tabular">{s.value}</p>
                          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {plan.zone && plan.zoneRespected === false ? (
                      <p className="rounded-2xl bg-amber-50 p-3 text-xs text-amber-700">
                        No encontramos sitios en <strong>{plan.zone}</strong> para este momento del día, así que el plan usa zonas cercanas. Prueba con otra zona u otro horario.
                      </p>
                    ) : null}

                    {(() => {
                      const { items, totalMin } = buildTimeline(plan, plan.timeOfDay ?? timeOfDay);
                      const venueBySlot: Record<'morning' | 'lunch' | 'afternoon', Venue | null> = {
                        morning: plan.morning,
                        lunch: plan.lunch,
                        afternoon: plan.afternoon
                      };
                      return (
                        <div className="relative space-y-3 pl-5">
                          <span className="absolute left-[5px] top-1 bottom-6 w-px bg-gradient-to-b from-royal/40 to-sky/20" />
                          {items.map((it) => {
                            const venue = venueBySlot[it.slot];
                            if (!venue) return null;
                            return (
                              <div key={it.slot} className="relative">
                                <span className="absolute -left-5 top-1.5 size-2.5 rounded-full bg-royal ring-4 ring-mist" />
                                <p className="font-mono text-xs text-muted tabular">{it.start}–{it.end}</p>
                                <a className="font-semibold text-ink hover:text-royal hover:underline" href={venue.url} target="_blank" rel="noreferrer">
                                  {it.label.split(' ')[0]} {venue.name}
                                </a>
                              </div>
                            );
                          })}
                          <p className="pt-1 text-xs text-muted">Duración total: {formatDuration(totalMin)}</p>
                        </div>
                      );
                    })()}

                    <div className="flex gap-2">
                      <button disabled={saving} className="flex-1 rounded-2xl bg-royal px-4 py-3 font-semibold text-white shadow-soft transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50" onClick={() => void savePlan()}>
                        {saving ? 'Guardando…' : 'Confirmar plan'}
                      </button>
                      <button disabled={saving} className="rounded-2xl border border-hair px-4 py-3 text-sm font-medium transition hover:bg-mist active:scale-95 disabled:opacity-50" onClick={() => void regeneratePlan()}>
                        Otra opción
                      </button>
                    </div>
                    <p className="text-center text-[11px] text-muted">No se guarda hasta que confirmes.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {active === 'planes' ? (
          <div className="space-y-5">
            <SectionHeader
              eyebrow="Tu agenda"
              title="Mis planes"
              subtitle={`${myPlans.length} ${myPlans.length === 1 ? 'plan guardado' : 'planes guardados'}`}
              icon="calendar"
            />
            {myPlans.length === 0 ? (
              <div className="card flex flex-col items-center p-10 text-center animate-fade-up">
                <span className="grid size-16 place-items-center rounded-3xl bg-mist text-royal animate-float-slow">
                  <Icon name="calendar" className="h-8 w-8" />
                </span>
                <p className="mt-4 display text-lg text-navy">Aún no tienes planes guardados</p>
                <p className="mt-1 text-sm text-muted">Crea uno en <strong>Generar plan</strong> y confírmalo para verlo aquí.</p>
                <button
                  className="btn-shine mt-5 flex items-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:brightness-105 active:scale-95"
                  onClick={() => setActive('generar')}
                >
                  <Icon name="sparkles" className="h-4 w-4" /> Generar un plan
                </button>
              </div>
            ) : null}
            <div className="space-y-3 stagger">
              {myPlans.map((p) => {
                const isExpanded = expandedPlanId === p.id;
                const isOrganizer = p.organizerId === authUser.id;
                const planSuggestions = suggestions[p.id] ?? [];
                const statusLabel = p.status === 'COMPLETED' ? '✅ Completado' : p.status === 'CANCELLED' ? '✖ Cancelado' : '🟢 Activo';
                return (
                  <article key={p.id} className={`overflow-hidden rounded-3xl border bg-white transition duration-300 ${isExpanded ? 'border-royal shadow-card' : 'border-hair shadow-soft hover:-translate-y-0.5 hover:border-sky'} ${p.status === 'COMPLETED' ? 'opacity-70' : ''}`}>
                    <button
                      type="button"
                      onClick={() => setExpandedPlanId(isExpanded ? null : p.id)}
                      className="flex w-full items-center justify-between gap-3 p-4 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="display text-lg font-semibold text-navy">{new Date(p.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                          {p.reservation ? (
                            <span className="rounded-full bg-[#2E7D52] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                              Reservado · {p.reservation.code}
                            </span>
                          ) : null}
                          {planSuggestions.length > 0 ? (
                            <span className="rounded-full bg-royal px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                              🔥 {planSuggestions.length} mejora{planSuggestions.length > 1 ? 's' : ''}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted">{statusLabel} · {p.participants.map((pp) => pp.user.name).join(', ')}</p>
                        <p className="mt-1 truncate text-xs text-[#43577A]">
                          {[
                            p.morningVenue ? `🌅 ${p.morningVenue.name}` : null,
                            `🍽️ ${p.lunchVenue.name}`,
                            p.afternoonVenue ? `☀️ ${p.afternoonVenue.name}` : null
                          ].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <span className={`grid size-8 shrink-0 place-items-center rounded-full bg-mist text-royal transition ${isExpanded ? 'rotate-180' : ''}`}>
                        <Icon name="chevron" className="h-4 w-4" />
                      </span>
                    </button>

                    {isExpanded ? (
                      <div className="space-y-4 border-t border-hair p-4 animate-slide-down">
                        <div className="grid gap-3 sm:grid-cols-3">
                          {([['🌅', 'Mañana', p.morningVenue], ['🍽️', 'Comida', p.lunchVenue], ['☀️', 'Tarde', p.afternoonVenue]] as const).map(([emoji, label, venue]) =>
                            venue ? (
                              <div key={label} className="rounded-2xl bg-mist p-3.5">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{emoji} {label}</p>
                                <a className="mt-1 flex items-center gap-1 font-semibold text-ink hover:text-royal hover:underline" href={venue.url} target="_blank" rel="noreferrer">
                                  {venue.name} <Icon name="arrow-ur" className="h-3.5 w-3.5" />
                                </a>
                                <p className="mt-1 text-xs text-muted">{venue.zone} · {venue.price === 0 ? 'Gratis' : `${venue.price}€`}</p>
                                <p className="text-xs text-muted">{venue.schedule}</p>
                              </div>
                            ) : null
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#43577A]">
                          <span>
                            Coste: <strong>{p.totalCost.toFixed(0)}€</strong> / {p.participants.length} {p.participants.length === 1 ? 'persona' : 'personas'} ={' '}
                            <strong>{(p.totalCost / p.participants.length).toFixed(0)}€</strong> pp
                          </span>
                          <span>Presupuesto: <strong>{p.totalBudget.toFixed(0)}€</strong></span>
                          <span>Zona: <strong>{p.zone || 'libre'}</strong></span>
                          {p.reservation ? <span>Reserva: <strong>{p.reservation.code}</strong></span> : null}
                        </div>

                        {(() => {
                          const { items, totalMin } = buildTimeline({ pace: p.pace, morning: p.morningVenue, lunch: p.lunchVenue, afternoon: p.afternoonVenue }, p.timeOfDay);
                          return (
                            <div className="rounded-2xl border border-hair p-3.5">
                              <p className="mb-2 text-xs font-semibold text-[#43577A]">Horario sugerido · {formatDuration(totalMin)}</p>
                              <div className="space-y-1 text-xs">
                                {items.map((it) => (
                                  <div key={it.slot} className="flex items-baseline gap-2">
                                    <span className="w-24 shrink-0 font-mono text-muted tabular">{it.start}–{it.end}</span>
                                    <span>{it.label} · {it.venueName}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {planSuggestions.length > 0 ? (
                          <div className="rounded-2xl border border-royal/15 bg-mist p-3.5">
                            <p className="text-xs font-bold text-royal">🔥 Mejores opciones para tus gustos</p>
                            <p className="mt-0.5 text-[11px] text-[#43577A]">Sugerencias según los gustos de los participantes. Tú decides si las aplicas.</p>
                            <div className="mt-2 space-y-2">
                              {planSuggestions.map((s) => {
                                const slotLabel = s.slot === 'morning' ? '🌅 Mañana' : s.slot === 'lunch' ? '🍽️ Comida' : '☀️ Tarde';
                                return (
                                  <div key={s.slot} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-2.5 shadow-soft">
                                    <div className="min-w-0 text-xs">
                                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{slotLabel}</p>
                                      <p className="truncate">
                                        <span className="text-muted line-through">{s.currentVenueName}</span>
                                        {' → '}
                                        <strong className="text-ink">{s.alternativeVenueName}</strong>
                                      </p>
                                      <p className="text-[10px] text-[#2E7D52]">
                                        {s.scoreImprovement} de afinidad
                                        {s.priceDelta !== 0 ? ` · ${s.priceDelta > 0 ? '+' : ''}${s.priceDelta}€/persona` : ' · mismo precio'}
                                      </p>
                                    </div>
                                    <button
                                      className="rounded-xl bg-royal px-3.5 py-2 text-xs font-semibold text-white transition active:scale-95 disabled:opacity-50"
                                      disabled={p.status !== 'ACTIVE'}
                                      onClick={() => void applySuggestion(p.id, s)}
                                    >
                                      Aplicar
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}

                        <div className="grid gap-2 sm:grid-cols-2">
                          <label className="text-xs font-medium text-ink/80">
                            Cambiar fecha
                            <input
                              type="date"
                              defaultValue={p.date.slice(0, 10)}
                              disabled={p.status !== 'ACTIVE'}
                              className="mt-1 w-full rounded-xl border border-hair p-2.5 disabled:opacity-50"
                              onBlur={(e) => {
                                if (e.target.value && e.target.value !== p.date.slice(0, 10)) void changePlanDate(p.id, e.target.value);
                              }}
                            />
                          </label>
                          <div className="flex flex-col justify-end gap-2">
                            {p.status === 'ACTIVE' && !p.reservation ? (
                              <button className="rounded-xl bg-royal px-3 py-2.5 text-xs font-semibold text-white transition active:scale-95" onClick={() => void reservePlan(p.id)}>
                                Reservar
                              </button>
                            ) : null}
                            {p.status === 'ACTIVE' ? (
                              <button className="rounded-xl bg-[#2E7D52] px-3 py-2.5 text-xs font-semibold text-white transition active:scale-95" onClick={() => void completePlan(p.id)}>
                                Marcar como completado
                              </button>
                            ) : null}
                            {isOrganizer ? (
                              <button className="rounded-xl border border-red-300 px-3 py-2.5 text-xs font-medium text-red-600 transition hover:bg-red-50 active:scale-95" onClick={() => void deletePlan(p.id)}>
                                Eliminar plan
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        ) : null}

        {active === 'sitios' ? (
          <div className="space-y-6">
            <SectionHeader eyebrow="Tu Madrid" title="Mis sitios" subtitle="Guarda tus lugares favoritos con ♥ para tenerlos a mano." icon="pin" />

            <section className="space-y-3">
              <p className="text-sm font-semibold text-ink">Tus favoritos ({favorites.length})</p>
              {favorites.length === 0 ? (
                <div className="card flex flex-col items-center p-8 text-center">
                  <span className="grid size-14 place-items-center rounded-3xl bg-mist text-royal">
                    <Icon name="heart" className="h-7 w-7" />
                  </span>
                  <p className="mt-3 font-semibold text-navy">Todavía no has guardado ningún sitio</p>
                  <p className="text-sm text-muted">Explora abajo y pulsa ♡ para añadirlo aquí.</p>
                </div>
              ) : (
                <div className="grid gap-2.5 stagger md:grid-cols-2">
                  {favorites.map((v) => (
                    <VenueRow key={v.id} v={v} />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-ink">Explorar sitios</p>
                <div className="relative w-full sm:w-72">
                  <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    className="w-full rounded-2xl border border-hair bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-royal focus:ring-4 focus:ring-royal/10"
                    placeholder="Buscar por nombre, zona o tag…"
                    value={siteSearch}
                    onChange={(e) => setSiteSearch(e.target.value)}
                  />
                </div>
              </div>
              {filteredVenues.length === 0 ? (
                <p className="rounded-2xl bg-mist p-4 text-sm text-muted">Nada coincide con tu búsqueda.</p>
              ) : (
                <div className="grid gap-2.5 md:grid-cols-2">
                  {filteredVenues.map((v) => (
                    <VenueRow key={v.id} v={v} />
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}

        {active === 'news' ? (
          <div className="space-y-5">
            <SectionHeader eyebrow="Lo que se cuece" title="Noticias" subtitle="Lo que se cuece en Madrid ahora mismo · vía esMadrid y Madrid Secreto" icon="flame" />

            {newsLoading ? (
              <div className="space-y-2.5 stagger">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton h-[68px] rounded-3xl" />
                ))}
              </div>
            ) : news.length === 0 ? (
              <div className="card flex flex-col items-center p-10 text-center">
                <span className="grid size-16 place-items-center rounded-3xl bg-mist text-royal animate-float-slow">
                  <Icon name="flame" className="h-8 w-8" />
                </span>
                <p className="mt-4 display text-lg text-navy">No hay novedades ahora mismo</p>
                <p className="mt-1 text-sm text-muted">
                  {newsError ? 'No pudimos conectar con la agenda de Madrid. Inténtalo más tarde.' : 'Vuelve en un rato, la agenda se actualiza sola.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 stagger">
                {news.map((ev, i) => (
                  <a
                    key={ev.id}
                    href={ev.url ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center gap-3.5 rounded-3xl border border-hair bg-white p-3.5 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:border-sky hover:shadow-card"
                  >
                    <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand text-sm font-bold text-white shadow-glow">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">{ev.title}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                        {ev.source ? <span className="rounded-full bg-mist px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-royal">{ev.source}</span> : null}
                        <span>{ev.category}</span>
                        {ev.date ? <span>· {new Date(ev.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}{ev.time ? ` · ${ev.time}` : ''}</span> : null}
                        {ev.venue ? <span className="truncate">· {ev.venue}</span> : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ev.free ? 'bg-[#E8F1E9] text-[#2E7D52]' : 'bg-mist text-[#3A5378]'}`}>
                        {ev.free ? 'Gratis' : ev.price || '€'}
                      </span>
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-royal"><Icon name="star" className="h-3 w-3" /> {ev.score}</span>
                    </div>
                  </a>
                ))}
                <p className="pt-1 text-center text-[11px] text-[#8DA0BC]">Fuentes: esMadrid · Madrid Secreto · Entradas.com · Agenda Madrid · Un Buen Día en Madrid · se actualiza periódicamente</p>
              </div>
            )}
          </div>
        ) : null}

        {active === 'admin' ? (
          <div className="space-y-5">
            <SectionHeader eyebrow="Zona restringida" title="Administración" subtitle="Requiere contraseña de administrador." icon="lock" />

            {!adminToken ? (
              <div className="card max-w-sm p-6 animate-fade-up">
                <label className={fieldLabel}>
                  Contraseña de administrador
                  <input
                    type="password"
                    className={inputCls}
                    value={adminPw}
                    onChange={(e) => setAdminPw(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void adminLogin();
                    }}
                    placeholder="••••••••"
                  />
                </label>
                {adminError ? <p className="mt-2 text-xs text-red-600">{adminError}</p> : null}
                <button
                  disabled={adminBusy || !adminPw}
                  className="mt-3 w-full rounded-2xl bg-navy px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                  onClick={() => void adminLogin()}
                >
                  {adminBusy ? 'Comprobando…' : 'Entrar'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 stagger sm:grid-cols-3 lg:grid-cols-6">
                  {([
                    ['Usuarios', adminOverview?.stats.users],
                    ['Venues', adminOverview?.stats.venues],
                    ['Del seed', adminOverview?.stats.seededVenues],
                    ['Descubiertos', adminOverview?.stats.discoveredVenues],
                    ['Planes', adminOverview?.stats.plans],
                    ['Reservas', adminOverview?.stats.reservations]
                  ] as const).map(([label, value]) => (
                    <div key={label} className="card p-4 text-center">
                      <p className="display text-2xl text-navy tabular">{value ?? '—'}</p>
                      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">Incorporar venues de tendencias</p>
                      <p className="text-xs text-muted">Descubre lugares en las fuentes (Entradas, Agenda Madrid…) y los añade a la BBDD.</p>
                    </div>
                    <button
                      disabled={adminBusy}
                      className="btn-shine flex items-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-glow transition hover:brightness-105 active:scale-95 disabled:opacity-50"
                      onClick={() => void incorporateVenues()}
                    >
                      <Icon name="sparkles" className="h-4 w-4" /> {adminBusy ? 'Incorporando…' : 'Incorporar venues'}
                    </button>
                  </div>
                  {adminMsg ? <p className="mt-2 text-xs text-[#2E7D52]">{adminMsg}</p> : null}
                  {adminError ? <p className="mt-2 text-xs text-red-600">{adminError}</p> : null}
                </div>

                <div className="card p-5">
                  <p className="mb-2 text-sm font-semibold text-ink">Usuarios ({adminOverview?.users.length ?? 0})</p>
                  <div className="flex flex-wrap gap-2">
                    {(adminOverview?.users ?? []).map((u) => (
                      <span key={u.id} className="flex items-center gap-1.5 rounded-full border border-hair px-3 py-1 text-xs">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: u.color }} />
                        {u.name} <span className="text-[#8DA0BC]">@{u.username}</span>
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  className="rounded-2xl border border-hair px-4 py-2.5 text-sm font-medium text-[#43577A] transition hover:bg-mist active:scale-95"
                  onClick={() => {
                    setStoredAdminToken(null);
                    setAdminToken(null);
                    setAdminOverview(null);
                    setAdminMsg(null);
                    void onLogout();
                  }}
                >
                  Salir de admin
                </button>
              </div>
            )}
          </div>
        ) : null}
      </main>

      {/* ---------------- Bottom tab bar (móvil, con FAB central) ---------------- */}
      {!isAdmin ? (
        <nav className="bottom-safe fixed inset-x-0 z-40 mx-auto flex w-[min(440px,calc(100%-1.5rem))] items-end justify-between rounded-[26px] border border-white/70 px-2 py-2 shadow-nav glass-strong lg:hidden">
          {bottomNav.map(({ key, label, icon, primary }) => {
            const on = active === key;
            if (primary) {
              return (
                <button
                  key={key}
                  onClick={() => selectTab(key)}
                  aria-label={label}
                  className="group relative -mt-7 flex flex-1 flex-col items-center"
                >
                  <span className={`grid size-14 place-items-center rounded-full bg-brand text-white shadow-glow ring-4 ring-white transition active:scale-90 ${on ? 'brightness-110' : ''}`}>
                    <Icon name={icon} className="h-7 w-7" />
                  </span>
                  <span className={`mt-1 text-[10px] font-semibold ${on ? 'text-royal' : 'text-muted'}`}>{label}</span>
                </button>
              );
            }
            return (
              <button
                key={key}
                onClick={() => selectTab(key)}
                aria-label={label}
                className="flex flex-1 flex-col items-center gap-1 rounded-2xl py-1.5 transition active:scale-90"
              >
                <span className={`grid size-9 place-items-center rounded-2xl transition ${on ? 'bg-mist text-royal' : 'text-[#8095B4]'}`}>
                  <Icon name={icon} className="h-[22px] w-[22px]" />
                </span>
                <span className={`text-[10px] font-semibold transition ${on ? 'text-royal' : 'text-muted'}`}>{label}</span>
              </button>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
