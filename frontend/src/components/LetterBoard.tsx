'use client';

import type { LetterGrid } from '@/lib/types';

const CELL_SIZES = {
  sm: 'w-10 h-10 text-lg',
  md: 'w-12 h-12 text-xl',
  lg: 'w-16 h-16 text-2xl',
};

interface LetterBoardProps {
  board: LetterGrid;
  selectedIndices?: number[];
  foundIndices?: number[];
  cellSize?: 'sm' | 'md' | 'lg';
}

export function LetterBoard({
  board,
  selectedIndices = [],
  foundIndices = [],
  cellSize = 'sm',
}: LetterBoardProps) {
  const selectedSet = new Set(selectedIndices);
  const foundSet = new Set(foundIndices);
  const sizeClass = CELL_SIZES[cellSize];

  return (
    <div
      className="inline-grid gap-1 select-none"
      style={{ gridTemplateColumns: `repeat(${board.cols}, 1fr)` }}
    >
      {board.letters.flatMap((row, r) =>
        row.map((letter, c) => {
          const idx = r * board.cols + c;

          if (letter === '') {
            return (
              <div
                key={idx}
                className={`${sizeClass} rounded bg-gray-700 pointer-events-none`}
              />
            );
          }

          const isSelected = selectedSet.has(idx);
          const isFound = foundSet.has(idx);
          return (
            <div
              key={idx}
              data-idx={idx}
              className={`
                flex items-center justify-center ${sizeClass} rounded font-bold border-2
                ${isSelected
                  ? 'bg-blue-500 text-white border-blue-700'
                  : isFound
                    ? 'bg-green-400 text-white border-green-600'
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
