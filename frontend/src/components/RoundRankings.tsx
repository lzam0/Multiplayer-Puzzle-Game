'use client';

import type { RoundRankEntry } from '@/lib/types';
import { formatMs } from '@/lib/format';

interface RoundRankingsProps {
  rankings: RoundRankEntry[];
  roundIndex: number;
}

export function RoundRankings({ rankings, roundIndex }: RoundRankingsProps) {
  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold text-center mb-4">Round {roundIndex + 1} Results</h2>
      <ol className="space-y-2">
        {rankings.map((entry) => {
          const finished = entry.completionTimeMs !== null;
          return (
            <li
              key={entry.playerId}
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-800"
            >
              <span className="text-xl font-bold text-gray-400 w-6">{entry.rank}</span>
              <span className="flex-1 font-medium text-white">{entry.name}</span>
              {finished ? (
                <span className="font-mono text-green-400 text-sm">
                  {formatMs(entry.completionTimeMs!)}
                </span>
              ) : (
                <span className="text-gray-500 text-sm">
                  {entry.wordsFound} word{entry.wordsFound !== 1 ? 's' : ''}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
