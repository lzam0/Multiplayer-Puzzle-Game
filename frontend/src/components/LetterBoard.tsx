'use client';

import type { LetterGrid } from '@/lib/types';

interface LetterBoardProps {
  board: LetterGrid;
  selectedIndices?: number[];
}

export function LetterBoard({ board, selectedIndices = [] }: LetterBoardProps) {
  const selectedSet = new Set(selectedIndices);

  return (
    <div
      className="inline-grid gap-1 select-none"
      style={{ gridTemplateColumns: `repeat(${board.cols}, 1fr)` }}
    >
      {board.letters.flatMap((row, r) =>
        row.map((letter, c) => {
          const idx = r * board.cols + c;
          const isSelected = selectedSet.has(idx);
          return (
            <div
              key={idx}
              data-idx={idx}
              className={`
                flex items-center justify-center w-10 h-10 rounded font-bold text-lg border-2
                ${isSelected
                  ? 'bg-blue-500 text-white border-blue-700'
                  : 'bg-white text-gray-800 border-gray-300'}
              `}
            >
              {letter}
            </div>
          );
        }),
      )}
    </div>
  );
}
