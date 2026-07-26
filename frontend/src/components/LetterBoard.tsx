'use client';

import type { LetterGrid, WordPath } from '@/lib/types';

const CELL_SIZES = {
  sm: 'w-10 h-10 text-lg',
  md: 'w-12 h-12 text-xl',
  lg: 'w-16 h-16 text-2xl',
};

const CELL_PX: Record<'sm' | 'md' | 'lg', number> = { sm: 40, md: 48, lg: 64 };
const GAP = 4;

function segmentAngle(fromIdx: number, toIdx: number, cols: number): number {
  const dr = Math.floor(toIdx / cols) - Math.floor(fromIdx / cols);
  const dc = (toIdx % cols) - (fromIdx % cols);
  if (dc > 0) return 0;
  if (dc < 0) return 180;
  if (dr > 0) return 90;
  return 270;
}

interface LetterBoardProps {
  board: LetterGrid;
  selectedIndices?: number[];
  foundIndices?: number[];
  foundWordPaths?: WordPath[];
  cellSize?: 'sm' | 'md' | 'lg';
}

export function LetterBoard({
  board,
  selectedIndices = [],
  foundIndices = [],
  foundWordPaths,
  cellSize = 'sm',
}: LetterBoardProps) {
  const selectedSet = new Set(selectedIndices);
  const sizeClass = CELL_SIZES[cellSize];
  const cellPx = CELL_PX[cellSize];

  const svgWidth = board.cols * (cellPx + GAP) - GAP;
  const svgHeight = board.rows * (cellPx + GAP) - GAP;

  const cx = (idx: number) => (idx % board.cols) * (cellPx + GAP) + cellPx / 2;
  const cy = (idx: number) => Math.floor(idx / board.cols) * (cellPx + GAP) + cellPx / 2;

  return (
    <div className="relative inline-block select-none">
      <style>{`
        @keyframes draw-stroke {
          from { stroke-dashoffset: 2000; }
          to   { stroke-dashoffset: 0; }
        }
        .word-stroke {
          stroke-dasharray: 2000;
          stroke-dashoffset: 0;
          animation: draw-stroke 0.3s ease forwards;
        }
      `}</style>

      <div
        className="inline-grid gap-1"
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
            return (
              <div
                key={idx}
                data-idx={idx}
                className={`
                  flex items-center justify-center ${sizeClass} rounded font-bold border-2
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

      {foundWordPaths && foundWordPaths.length > 0 && (
        <svg
          className="absolute top-0 left-0 pointer-events-none"
          width={svgWidth}
          height={svgHeight}
          style={{ overflow: 'visible' }}
        >
          {foundWordPaths.map((path) => {
            const points = path.indices.map((i) => `${cx(i)},${cy(i)}`).join(' ');
            return (
              <g key={path.word}>
                <polyline
                  points={points}
                  stroke={path.color}
                  strokeWidth={cellPx - 4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  opacity={0.35}
                  className="word-stroke"
                />
                {path.indices.slice(0, -1).map((fromIdx, i) => {
                  const toIdx = path.indices[i + 1];
                  if (toIdx === undefined) return null;
                  const midX = (cx(fromIdx) + cx(toIdx)) / 2;
                  const midY = (cy(fromIdx) + cy(toIdx)) / 2;
                  const angle = segmentAngle(fromIdx, toIdx, board.cols);
                  return (
                    <text
                      key={i}
                      x={midX}
                      y={midY}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={cellPx * 0.35}
                      fill="white"
                      opacity={0.9}
                      transform={`rotate(${angle}, ${midX}, ${midY})`}
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      ›
                    </text>
                  );
                })}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
