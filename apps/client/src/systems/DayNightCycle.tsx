import { useTime } from '../hooks/useTime';
import { Season } from '../components/Farm/Season';

/**
 * Maps a continuous hour (0..24) to an RGBA overlay color and opacity.
 *
 * Periods:
 * - Night  (0–5)   : dark blue, opacity lerps from 0.55 → 0.40 as morning nears
 * - Dawn   (5–7)   : warm orange/amber tint, opacity lerps 0.25 → 0.05
 * - Day    (7–17)  : no overlay (transparent)
 * - Dusk   (17–20) : warm red/orange tint, opacity lerps 0.05 → 0.55
 * - Night  (20–24) : dark blue, opacity lerps from 0.40 → 0.55
 */
function getOverlayStyle(hour: number): { background: string; opacity: number } {
  // Night → pre-dawn (0..5)
  if (hour < 5) {
    const t = hour / 5; // 0 at midnight, 1 at 5 AM
    const opacity = 0.55 - t * 0.15; // 0.55 → 0.40
    return { background: 'rgb(10, 20, 60)', opacity };
  }

  // Dawn (5..7): warm amber/orange lifting
  if (hour < 7) {
    const t = (hour - 5) / 2; // 0 at 5 AM, 1 at 7 AM
    const opacity = 0.25 - t * 0.25; // 0.25 → 0.00
    return { background: 'rgb(200, 100, 30)', opacity };
  }

  // Full day (7..17): clear
  if (hour < 17) {
    return { background: 'rgb(0,0,0)', opacity: 0 };
  }

  // Dusk (17..20): warm red-orange deepening
  if (hour < 20) {
    const t = (hour - 17) / 3; // 0 at 5 PM, 1 at 8 PM
    const opacity = t * 0.4; // 0.00 → 0.40
    return { background: 'rgb(180, 60, 20)', opacity };
  }

  // Late evening / night (20..24): shift to dark blue and deepen
  const t = (hour - 20) / 4; // 0 at 8 PM, 1 at midnight
  const opacity = 0.4 + t * 0.15; // 0.40 → 0.55
  return { background: 'rgb(10, 20, 60)', opacity };
}

/** Compact clock + time-of-day badge rendered in the HUD. */
function TimeLabel({ hour, formattedTime }: { hour: number; formattedTime: string }) {
  const isDark = hour >= 20 || hour < 5;
  const isDawn = hour >= 5 && hour < 7;
  const isDusk = hour >= 17 && hour < 20;

  let icon = '☀';
  if (isDark) icon = '🌙';
  else if (isDawn || isDusk) icon = '🌅';

  return (
    <div
      className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/60 backdrop-blur text-xs font-mono text-slate-200"
      aria-label={`Hora: ${formattedTime}`}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{formattedTime}</span>
    </div>
  );
}

/**
 * Full-screen day-night overlay. Pointer-events-none so it never blocks input.
 *
 * Visual mapping:
 * - Dawn  (5–7 h) : warm amber/orange tint fading in then out
 * - Day   (7–17 h): no tint — full visibility
 * - Dusk  (17–20 h): warm red/orange tint fading in
 * - Night (20–5 h) : dark blue overlay at 0.40–0.55 opacity
 *
 * Also renders a small clock badge at the top-centre of the screen.
 */
export function DayNightCycle() {
  const { hour, formattedTime } = useTime();
  const { background, opacity } = getOverlayStyle(hour);

  return (
    <>
      {/* Full-screen colour overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        data-time-period={
          hour >= 20 || hour < 5 ? 'night' : hour < 7 ? 'dawn' : hour < 17 ? 'day' : 'dusk'
        }
        style={{
          background,
          opacity,
          transition: 'background 4s ease, opacity 4s ease',
          mixBlendMode: 'multiply',
        }}
      />

      {/* Clock badge */}
      <TimeLabel hour={hour} formattedTime={formattedTime} />

      {/* Season + weather badge */}
      <Season />
    </>
  );
}
