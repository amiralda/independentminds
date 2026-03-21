import { useEffect, useState } from "react";

/**
 * Returns a `tick` counter that increments every `intervalMs` milliseconds.
 * Use as a dependency in useEffect to auto-refresh data.
 */
export function useAutoRefresh(intervalMs = 30_000) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return tick;
}
