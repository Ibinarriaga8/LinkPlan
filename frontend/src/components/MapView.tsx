'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Venue } from '@/types';

// Centroides aproximados de los distritos/zonas de Madrid. Como las venues
// guardan zona (no lat/lng), situamos cada sitio alrededor del centro de su
// zona con un pequeño desplazamiento determinista para que no se solapen.
const ZONE_COORDS: Record<string, [number, number]> = {
  'centro': [40.4154, -3.7074],
  'malasaña': [40.4268, -3.7033],
  'chamberí': [40.4339, -3.7016],
  'la latina': [40.4092, -3.711],
  'retiro': [40.4119, -3.6796],
  'salamanca': [40.4307, -3.6792],
  'chamartín': [40.4631, -3.6772],
  'tetuán': [40.4602, -3.6975],
  'arganzuela': [40.3954, -3.6967],
  'moncloa - aravaca': [40.4355, -3.725],
  'moncloa-aravaca': [40.4355, -3.725],
  'carabanchel': [40.3824, -3.728],
  'usera': [40.3815, -3.7065],
  'ciudad lineal': [40.4498, -3.6498],
  'hortaleza': [40.4759, -3.6411],
  'fuencarral - el pardo': [40.4906, -3.7096],
  'san blas - canillejas': [40.429, -3.6122],
  'villaverde': [40.3458, -3.699],
  'moratalaz': [40.4072, -3.6453],
  'vicálvaro': [40.4039, -3.6082],
  'villa de vallecas': [40.3793, -3.6213],
  'puente de vallecas': [40.3987, -3.6688],
  'barajas': [40.473, -3.58],
  'latina': [40.4015, -3.743]
};
const CENTER: [number, number] = [40.4168, -3.7038];
const COLORS = { RESTAURANT: '#C4673A', ACTIVITY: '#0E4DA4' } as const;

export type PlanRoute = { id: string; label: string; stops: Venue[] };

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function posFor(v: Venue): [number, number] | null {
  const key = (v.zone || '').trim().toLowerCase();
  let base: [number, number] | undefined = ZONE_COORDS[key];
  if (!base) {
    const hit = Object.keys(ZONE_COORDS).find((z) => key.includes(z) || z.includes(key));
    base = hit ? ZONE_COORDS[hit] : undefined;
  }
  if (!base) return null;
  const h = hash(v.id);
  const ang = (h % 360) * (Math.PI / 180);
  const rad = 0.0012 + ((h >> 9) % 1000) / 1000 * 0.0034;
  return [base[0] + Math.sin(ang) * rad, base[1] + Math.cos(ang) * rad * 1.35];
}

function loadLeaflet(): Promise<any> {
  const w = window as unknown as { L?: any };
  return new Promise((resolve, reject) => {
    if (w.L) return resolve(w.L);
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    let s = document.getElementById('leaflet-js') as HTMLScriptElement | null;
    if (s && w.L) return resolve(w.L);
    if (!s) {
      s = document.createElement('script');
      s.id = 'leaflet-js';
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      s.async = true;
      document.body.appendChild(s);
    }
    s.addEventListener('load', () => resolve(w.L));
    s.addEventListener('error', () => reject(new Error('No se pudo cargar el mapa')));
  });
}

type Filter = 'all' | 'RESTAURANT' | 'ACTIVITY';

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}

function popupHtml(v: Venue, fav: boolean) {
  const price = v.price === 0 ? 'Gratis' : `${v.price}€`;
  const emoji = v.type === 'RESTAURANT' ? '🍽️' : '🎟️';
  return `<div style="font-family:var(--font-sans),system-ui;min-width:170px">
      <div style="font-weight:700;color:#15233d;font-size:14px">${fav ? '⭐ ' : ''}${emoji} ${esc(v.name)}</div>
      <div style="color:#64748B;font-size:12px;margin-top:2px">${esc(v.zone || '')} · ${price}</div>
      <a href="${esc(v.url)}" target="_blank" rel="noreferrer" style="display:inline-block;margin-top:8px;color:#0E4DA4;font-weight:600;font-size:12px;text-decoration:none">Ver web ↗</a>
    </div>`;
}

export function MapView({
  venues,
  favoriteIds,
  plans = []
}: {
  venues: Venue[];
  favoriteIds?: Set<string>;
  plans?: PlanRoute[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const venueLayerRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [routeId, setRouteId] = useState<string | null>(plans[0]?.id ?? null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const plottable = useMemo(() => venues.map((v) => ({ v, pos: posFor(v) })).filter((x) => x.pos), [venues]);
  const shown = useMemo(() => plottable.filter((x) => filter === 'all' || x.v.type === filter), [plottable, filter]);

  // Inicializa el mapa una vez.
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const map = L.map(containerRef.current, { scrollWheelZoom: true, zoomControl: true }).setView(CENTER, 12.4);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap &copy; CARTO',
          maxZoom: 19
        }).addTo(map);
        routeLayerRef.current = L.layerGroup().addTo(map); // ruta debajo
        venueLayerRef.current = L.layerGroup().addTo(map); // marcadores encima
        mapRef.current = map;
        setStatus('ready');
        setTimeout(() => map.invalidateSize(), 200);
      })
      .catch(() => !cancelled && setStatus('error'));
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // (Re)pinta los marcadores de sitios. Favoritos -> estrella; resto -> punto.
  useEffect(() => {
    const w = window as unknown as { L?: any };
    if (status !== 'ready' || !w.L || !venueLayerRef.current) return;
    const L = w.L;
    venueLayerRef.current.clearLayers();
    shown.forEach(({ v, pos }) => {
      const fav = favoriteIds?.has(v.id) ?? false;
      let marker: any;
      if (fav) {
        const icon = L.divIcon({
          className: '',
          html: `<div style="display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:#fff;border:2px solid ${COLORS[v.type]};box-shadow:0 1px 5px rgba(0,0,0,.3);color:#F4B400;font-size:16px;line-height:1">★</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });
        marker = L.marker(pos as [number, number], { icon, zIndexOffset: 500 });
      } else {
        marker = L.circleMarker(pos as [number, number], {
          radius: 7,
          weight: 2,
          color: '#ffffff',
          fillColor: COLORS[v.type],
          fillOpacity: 0.95
        });
      }
      marker.bindPopup(popupHtml(v, fav), { closeButton: true });
      marker.addTo(venueLayerRef.current);
    });
  }, [shown, status, favoriteIds]);

  // Dibuja la ruta del plan seleccionado (línea + paradas numeradas).
  useEffect(() => {
    const w = window as unknown as { L?: any };
    if (status !== 'ready' || !w.L || !routeLayerRef.current || !mapRef.current) return;
    const L = w.L;
    routeLayerRef.current.clearLayers();
    const route = plans.find((p) => p.id === routeId);
    if (!route) return;
    const pts: [number, number][] = [];
    route.stops.forEach((s, i) => {
      const p = posFor(s);
      if (!p) return;
      pts.push(p);
      const icon = L.divIcon({
        className: '',
        html: `<div style="display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#0E4DA4;color:#fff;font-weight:700;font-size:13px;border:2px solid #fff;box-shadow:0 2px 6px rgba(10,46,110,.45)">${i + 1}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
      L.marker(p, { icon, zIndexOffset: 1000 }).bindPopup(popupHtml(s, favoriteIds?.has(s.id) ?? false)).addTo(routeLayerRef.current);
    });
    if (pts.length >= 2) {
      const line = L.polyline(pts, { color: '#0E4DA4', weight: 4, opacity: 0.9, dashArray: '1 9', lineCap: 'round' }).addTo(routeLayerRef.current);
      mapRef.current.fitBounds(line.getBounds().pad(0.5));
    } else if (pts.length === 1) {
      mapRef.current.setView(pts[0], 15);
    }
  }, [routeId, plans, status, favoriteIds]);

  const counts = useMemo(
    () => ({
      all: plottable.length,
      RESTAURANT: plottable.filter((x) => x.v.type === 'RESTAURANT').length,
      ACTIVITY: plottable.filter((x) => x.v.type === 'ACTIVITY').length
    }),
    [plottable]
  );

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: `Todos (${counts.all})` },
    { key: 'RESTAURANT', label: `🍽️ Restaurantes (${counts.RESTAURANT})` },
    { key: 'ACTIVITY', label: `🎟️ Sitios y planes (${counts.ACTIVITY})` }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition active:scale-95 ${
              filter === f.key ? 'border-navy bg-navy text-white shadow-soft' : 'border-hair bg-white text-navy hover:border-royal'
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto flex flex-wrap items-center gap-3 text-xs text-muted">
          <span className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-full" style={{ backgroundColor: COLORS.RESTAURANT }} /> Restaurante</span>
          <span className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-full" style={{ backgroundColor: COLORS.ACTIVITY }} /> Plan</span>
          <span className="flex items-center gap-1.5 text-[#F4B400]">★ <span className="text-muted">Favorito</span></span>
        </span>
      </div>

      {plans.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-hair bg-white p-3 shadow-soft">
          <span className="text-sm font-semibold text-ink">🗺️ Ruta de tu plan:</span>
          <button
            onClick={() => setRouteId(null)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition active:scale-95 ${
              routeId === null ? 'border-navy bg-navy text-white' : 'border-hair text-navy hover:border-royal'
            }`}
          >
            Ninguna
          </button>
          {plans.map((p) => (
            <button
              key={p.id}
              onClick={() => setRouteId(p.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition active:scale-95 ${
                routeId === p.id ? 'border-royal bg-royal text-white' : 'border-hair text-navy hover:border-royal'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="relative overflow-hidden rounded-3xl border border-hair shadow-card">
        <div ref={containerRef} className="h-[62vh] min-h-[380px] w-full bg-mist" />
        {status !== 'ready' ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-mist/60">
            {status === 'error' ? (
              <p className="rounded-xl bg-white px-4 py-2 text-sm text-muted shadow-soft">No se pudo cargar el mapa. Revisa tu conexión.</p>
            ) : (
              <p className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-muted shadow-soft">
                <span className="size-3 animate-pulse rounded-full bg-royal" /> Cargando el mapa de Madrid…
              </p>
            )}
          </div>
        ) : null}
      </div>
      <p className="text-center text-[11px] text-muted">
        Los sitios se agrupan por zona sobre el mapa de Madrid. Tus favoritos salen con ⭐. Pulsa un punto para ver el detalle.
      </p>
    </div>
  );
}
