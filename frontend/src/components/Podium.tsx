'use client';

import type { PodiumEntry } from '@/lib/types';
import { formatMs } from '@/lib/format';

const MEDALS = ['', '🥇', '🥈', '🥉'];
const PODIUM_COLORS = ['', 'text-yellow-400', 'text-gray-300', 'text-amber-600'];

interface PodiumProps {
  podium: PodiumEntry[];
}

export function Podium({ podium }: PodiumProps) {
  const top3 = podium.filter((e) => e.rank <= 3);
  const rest = podium.filter((e) => e.rank > 3);

  return (
    <div className="w-full max-w-md mx-auto">
      <h2 className="text-3xl font-extrabold text-center mb-6">Final Podium</h2>

      <ol className="space-y-3 mb-4">
        {top3.map((entry) => (
          <li
            key={entry.playerId}
            className="flex items-center gap-3 p-4 rounded-xl bg-gray-800"
          >
            <span className={`text-2xl w-8 ${PODIUM_COLORS[entry.rank]}`}>
              {MEDALS[entry.rank]}
            </span>
            <span className="flex-1 font-bold text-white text-lg">{entry.name}</span>
            <span className="font-mono text-green-400">{formatMs(entry.totalTimeMs)}</span>
          </li>
        ))}
      </ol>

      {rest.length > 0 && (
        <ol className="space-y-2">
          {rest.map((entry) => (
            <li
              key={entry.playerId}
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-700"
            >
              <span className="text-gray-400 w-8 font-bold">{entry.rank}.</span>
              <span className="flex-1 text-gray-200">{entry.name}</span>
              <span className="font-mono text-gray-400 text-sm">{formatMs(entry.totalTimeMs)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
