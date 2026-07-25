'use client';

import type { Score } from '@/lib/types';

interface ScoreboardProps {
  scores: Score[];
}

export function Scoreboard({ scores }: ScoreboardProps) {
  const sorted = [...scores].sort((a, b) => b.score - a.score);

  return (
    <div className="w-full max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-center mb-4">Final Scores</h2>
      <ol className="space-y-2">
        {sorted.map((s, i) => (
          <li
            key={s.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-gray-100"
          >
            <span className="text-xl font-bold text-gray-500 w-6">
              {i + 1}
            </span>
            <span className="flex-1 font-medium">{s.name}</span>
            <span className="font-bold text-blue-600">{s.score} pts</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
