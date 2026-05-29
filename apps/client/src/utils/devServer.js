/* global AbortController, setTimeout, clearTimeout, fetch */
import { useState, useEffect } from 'react';

const HEALTH_URL = '/api/health';
const TIMEOUT_MS = 3000;

export async function checkServerHealth() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(HEALTH_URL, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return { online: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { online: true, data };
  } catch (err) {
    return { online: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function useServerHealth() {
  const [health, setHealth] = useState({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    checkServerHealth().then((result) => {
      if (cancelled) return;
      if (result.online) {
        setHealth({ kind: 'ok', data: result.data });
      } else {
        setHealth({ kind: 'error', message: result.error });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return health;
}
