import { useEffect, useState } from 'react';

/** Whole seconds left until `expiresAt` (never negative), ticking every second. */
export function useRemainingSeconds(expiresAt: string | null): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(timer);
  }, []);

  if (expiresAt === null) {
    return null;
  }

  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 1000));
}
