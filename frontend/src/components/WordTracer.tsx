'use client';

import React, { useCallback, useRef, useState } from 'react';
import type { LetterGrid, WordPath } from '@/lib/types';
import { LetterBoard } from './LetterBoard';

interface WordTracerProps {
  board: LetterGrid;
  onTrace: (word: string, letterIndices: number[]) => void;
  foundIndices?: number[];
  foundWordPaths?: WordPath[];
  locked?: boolean;
}

function isOrthogonallyAdjacent(a: number, b: number, cols: number): boolean {
  const dRow = Math.abs(Math.floor(a / cols) - Math.floor(b / cols));
  const dCol = Math.abs((a % cols) - (b % cols));
  return (dRow === 1 && dCol === 0) || (dRow === 0 && dCol === 1);
}

function getCellIndexFromPoint(
  container: HTMLElement,
  clientX: number,
  clientY: number,
): number | null {
  const el = document.elementFromPoint(clientX, clientY);
  if (!el) return null;
  const cell = el.closest('[data-idx]');
  if (!cell) return null;
  const idx = cell.getAttribute('data-idx');
  if (idx === null) return null;
  return parseInt(idx, 10);
}

export function WordTracer({ board, onTrace, foundIndices = [], foundWordPaths, locked = false }: WordTracerProps) {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const isTracingRef = useRef(false);

  const startTrace = useCallback(
    (clientX: number, clientY: number) => {
      if (locked || !containerRef.current) return;
      isTracingRef.current = true;
      const idx = getCellIndexFromPoint(containerRef.current, clientX, clientY);
      if (idx !== null) {
        setSelectedIndices([idx]);
      }
    },
    [locked],
  );

  const continueTrace = useCallback(
    (clientX: number, clientY: number) => {
      if (!isTracingRef.current || !containerRef.current) return;
      const idx = getCellIndexFromPoint(containerRef.current, clientX, clientY);
      if (idx === null) return;
      setSelectedIndices((prev) => {
        if (prev.length === 0) return prev;
        if (prev.includes(idx)) return prev;
        // Only extend the path to orthogonally adjacent cells — fast drags on
        // mobile can skip intermediate cells, producing paths the server rejects.
        if (!isOrthogonallyAdjacent(prev[prev.length - 1], idx, board.cols)) return prev;
        return [...prev, idx];
      });
    },
    [board.cols],
  );

  const endTrace = useCallback(() => {
    if (!isTracingRef.current) return;
    isTracingRef.current = false;

    setSelectedIndices((current) => {
      if (current.length > 0) {
        const word = current
          .map((idx) => {
            const row = Math.floor(idx / board.cols);
            const col = idx % board.cols;
            return board.letters[row]?.[col] ?? '';
          })
          .join('');
        onTrace(word, current);
      }
      return [];
    });
  }, [board, onTrace]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      startTrace(e.clientX, e.clientY);
    },
    [startTrace],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      continueTrace(e.clientX, e.clientY);
    },
    [continueTrace],
  );

  const onPointerUp = useCallback(() => {
    endTrace();
  }, [endTrace]);

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{ touchAction: 'none' }}
      className={locked ? 'cursor-default opacity-80' : 'cursor-pointer'}
    >
      <LetterBoard board={board} selectedIndices={selectedIndices} foundIndices={foundIndices} foundWordPaths={foundWordPaths} />
    </div>
  );
}
