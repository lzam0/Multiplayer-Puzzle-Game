'use client';

import { useRef, useState } from 'react';

export function useStopwatch() {
  const startRef = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    startRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      setElapsed(Date.now() - startRef.current!);
    }, 100);
  };

  const stop = (): number => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const final = Date.now() - (startRef.current ?? Date.now());
    setElapsed(final);
    return final;
  };

  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    startRef.current = null;
    setElapsed(0);
  };

  return { elapsed, start, stop, reset };
}
