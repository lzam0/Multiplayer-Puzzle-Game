'use client';

import type { PlayerFinishedPayload } from '@/lib/types';
import { formatMs } from '@/lib/format';

interface FinishTrackerProps {
  finishers: PlayerFinishedPayload[];
  totalPlayers: number;
}

export function FinishTracker({ finishers, totalPlayers }: FinishTrackerProps) {
  return (
    <div className="w-full">
      <p className="text-sm uppercase tracking-widest text-gray-400 mb-2">
        Finished ({finishers.length}/{totalPlayers})
      </p>
      {finishers.length === 0 ? (
        <p className="text-gray-500 italic text-sm">No finishers yet…</p>
      ) : (
        <ol className="space-y-1">
          {finishers.map((f, i) => (
            <li key={f.playerId} className="flex items-center gap-3">
              <span className="text-gray-400 w-4 text-sm">{i + 1}.</span>
              <span className="flex-1 font-medium text-white">{f.name}</span>
              <span className="font-mono text-green-400 text-sm">{formatMs(f.completionTimeMs)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
