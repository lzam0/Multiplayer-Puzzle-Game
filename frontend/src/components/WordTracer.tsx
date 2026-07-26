'use client';

import React, { useCallback, useRef, useState } from 'react';
import type { LetterGrid } from '@/lib/types';
import { LetterBoard } from './LetterBoard';

interface WordTracerProps {
  board: LetterGrid;
  onTrace: (word: string, letterIndices: number[]) => void;
  foundIndices?: number[];
  locked?: boolean;
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

export function WordTracer({ board, onTrace, foundIndices = [], locked = false }: WordTracerProps) {
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
        if (prev.includes(idx)) return prev;
        return [...prev, idx];
      });
    },
    [],
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
      <LetterBoard board={board} selectedIndices={selectedIndices} foundIndices={foundIndices} />
    </div>
  );
}
