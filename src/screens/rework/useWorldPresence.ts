import { useEffect, useState } from 'react';
import type { WorldPresence } from '../../../shared/player-profile';

export function useWorldPresence() {
  const [presence, setPresence] = useState<WorldPresence | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    let pending = false;
    const refresh = async () => {
      if (pending || document.hidden) return;
      pending = true;
      try {
        const response = await fetch('/api/hollow/presence', {
          signal: AbortSignal.any([abort.signal, AbortSignal.timeout(8000)]),
        });
        if (!response.ok) throw new Error('Presence unavailable');
        const value = (await response.json()) as WorldPresence;
        if (
          !Number.isInteger(value.players) ||
          value.players < 0 ||
          !Number.isInteger(value.streetCapacity) ||
          value.streetCapacity < 1
        )
          throw new Error('Presence unavailable');
        if (!abort.signal.aborted) setPresence(value);
      } catch {
        if (!abort.signal.aborted) setPresence(null);
      } finally {
        pending = false;
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 10000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      abort.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  return presence;
}
