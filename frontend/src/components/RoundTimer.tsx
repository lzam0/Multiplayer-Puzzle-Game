'use client';

import { useEffect, useState } from 'react';
import { formatMs } from '@/lib/format';

interface RoundTimerProps {
  endsAt: number;
}

export function RoundTimer({ endsAt }: RoundTimerProps) {
  const [remaining, setRemaining] = useState(() => Math.max(0, endsAt - Date.now()));

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, endsAt - Date.now()));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [endsAt]);

  const isLow = remaining < 15_000;

  return (
    <div className={`text-center ${isLow ? 'text-red-400' : 'text-white'}`}>
      <p className="text-sm uppercase tracking-widest text-gray-400">Time Remaining</p>
      <p className="text-5xl font-extrabold font-mono">{formatMs(remaining)}</p>
    </div>
  );
}
