/**
 * WeatherDisplay — compact HUD strip showing current weather, season,
 * in-game clock, and tomorrow's forecast.
 *
 * Positioned bottom-left so it does not clash with the existing header
 * (top-left) or the health panel (top-right).
 *
 * Toggle visibility with the W key.
 */
import { useEffect, useState } from 'react';
import { useWeatherStore } from '../systems/weather/weatherStore';
import { useTimeStore, currentSeason, SEASON_LABEL, formatClock } from '../systems/time/timeStore';
import type { WeatherType } from '../systems/weather/weatherStore';

const WEATHER_LABEL: Record<WeatherType, string> = {
  sunny: 'Ensolarado',
  cloudy: 'Nublado',
  rainy: 'Chuvoso',
  stormy: 'Tempestade',
  windy: 'Ventoso',
  snowy: 'Nevando',
};

/** Inline SVG icons — no external asset files required. */
function WeatherIcon({ type, size = 20 }: { type: WeatherType; size?: number }) {
  const style = { width: size, height: size, flexShrink: 0 } as const;
  switch (type) {
    case 'sunny':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4" fill="#FCD34D" />
          {([0, 45, 90, 135, 180, 225, 270, 315] as const).map((deg) => (
            <line
              key={deg}
              x1="12"
              y1="12"
              x2={12 + 8 * Math.cos((deg * Math.PI) / 180)}
              y2={12 + 8 * Math.sin((deg * Math.PI) / 180)}
              stroke="#FCD34D"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          ))}
        </svg>
      );
    case 'cloudy':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6.5 17a4.5 4.5 0 1 1 .44-8.98A5.002 5.002 0 0 1 17 10.5a3.5 3.5 0 0 1 0 7H6.5Z"
            fill="#94A3B8"
          />
        </svg>
      );
    case 'rainy':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6.5 15a4.5 4.5 0 1 1 .44-8.98A5.002 5.002 0 0 1 17 8.5a3.5 3.5 0 0 1 0 7H6.5Z"
            fill="#94A3B8"
          />
          <line
            x1="8"
            y1="18"
            x2="7"
            y2="22"
            stroke="#60A5FA"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line
            x1="12"
            y1="18"
            x2="11"
            y2="22"
            stroke="#60A5FA"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line
            x1="16"
            y1="18"
            x2="15"
            y2="22"
            stroke="#60A5FA"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'stormy':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6.5 13a4.5 4.5 0 1 1 .44-8.98A5.002 5.002 0 0 1 17 6.5a3.5 3.5 0 0 1 0 7H6.5Z"
            fill="#64748B"
          />
          <polyline
            points="13,14 10,19 13,19 10,24"
            stroke="#FDE047"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      );
    case 'windy':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 8h10a3 3 0 1 0-3-3"
            stroke="#94A3B8"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M4 12h14a3 3 0 1 1-3 3"
            stroke="#94A3B8"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path d="M4 16h8" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'snowy':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6.5 15a4.5 4.5 0 1 1 .44-8.98A5.002 5.002 0 0 1 17 8.5a3.5 3.5 0 0 1 0 7H6.5Z"
            fill="#CBD5E1"
          />
          <circle cx="8" cy="20" r="1" fill="#BAE6FD" />
          <circle cx="12" cy="22" r="1" fill="#BAE6FD" />
          <circle cx="16" cy="20" r="1" fill="#BAE6FD" />
        </svg>
      );
  }
}

const SEASON_COLORS: Record<string, string> = {
  spring: 'text-emerald-400',
  summer: 'text-amber-400',
  autumn: 'text-orange-400',
  winter: 'text-sky-300',
};

export function WeatherDisplay() {
  const [visible, setVisible] = useState(true);

  const today = useWeatherStore((s) => s.today);
  const forecast = useWeatherStore((s) => s.forecast);
  const hour = useTimeStore((s) => s.hour);
  const timeState = useTimeStore((s) => s);
  const season = currentSeason(timeState);
  const day = useTimeStore((s) => s.dayInSeason);
  const year = useTimeStore((s) => s.year);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // W key toggles weather display; ignore when typing in inputs
      if (
        e.code === 'KeyW' &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        setVisible((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!visible) return null;

  const seasonColor = SEASON_COLORS[season] ?? 'text-slate-300';

  return (
    <aside
      className="pointer-events-none absolute bottom-24 left-4 bg-slate-900/80 backdrop-blur-sm border border-slate-700/60 rounded-xl shadow-lg px-3 py-2.5 min-w-[160px]"
      aria-label="Clima e estacao"
    >
      {/* Season / day / year */}
      <div className={`text-[11px] font-semibold tracking-wide uppercase mb-1 ${seasonColor}`}>
        {SEASON_LABEL[season]} · Dia {day} · Ano {year}
      </div>

      {/* Clock */}
      <div className="text-[10px] text-slate-500 font-mono mb-2">{formatClock(hour)}</div>

      {/* Today */}
      <div className="flex items-center gap-2">
        <WeatherIcon type={today} size={20} />
        <span className="text-xs text-slate-200 font-medium">{WEATHER_LABEL[today]}</span>
      </div>

      {/* Forecast */}
      <div className="flex items-center gap-2 mt-1.5 opacity-60">
        <WeatherIcon type={forecast} size={16} />
        <span className="text-[10px] text-slate-400">Amanha: {WEATHER_LABEL[forecast]}</span>
      </div>

      {/* Toggle hint */}
      <div className="mt-2 text-[9px] text-slate-600 tracking-wide">W · ocultar</div>
    </aside>
  );
}
