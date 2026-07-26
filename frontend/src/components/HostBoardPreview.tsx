'use client';

import type { LetterGrid } from '@/lib/types';
import { LetterBoard } from './LetterBoard';

interface HostBoardPreviewProps {
  board: LetterGrid;
  topic: string;
  roundIndex: number;
  totalRounds: number;
}

export function HostBoardPreview({ board, topic, roundIndex, totalRounds }: HostBoardPreviewProps) {
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl">
      <div className="text-center">
        <p className="text-gray-400 text-sm uppercase tracking-widest">
          Round {roundIndex + 1} of {totalRounds} — Preview
        </p>
        <p className="text-3xl font-bold text-white mt-1">{topic}</p>
        <p className="text-yellow-400 text-sm mt-2">Players see this in 5 seconds…</p>
      </div>
      <div className="bg-gray-800 rounded-2xl p-6 flex flex-col items-center gap-4">
        <LetterBoard board={board} />
        <div className="flex flex-wrap gap-2 justify-center">
          {board.words.map((w) => (
            <span key={w} className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-sm font-mono">
              {w}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
