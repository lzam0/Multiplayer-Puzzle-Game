'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { LetterGrid, WordPath } from '@/lib/types';
import { LetterBoard } from './LetterBoard';

interface WordTracerProps {
  board: LetterGrid;
  onTrace: (word: string, letterIndices: number[]) => void;
  foundIndices?: number[];
  foundWordPaths?: WordPath[];
  locked?: boolean;
  onReset?: () => void;
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

// Returns the cells between `from` and `to` (exclusive of `from`, inclusive of
// `to`) when they share the same row or column. Returns null for diagonal jumps.
// Used to fill cells skipped by fast pointer movement on mobile.
function fillBetween(from: number, to: number, cols: number): number[] | null {
  const fromRow = Math.floor(from / cols);
  const fromCol = from % cols;
  const toRow = Math.floor(to / cols);
  const toCol = to % cols;

  if (fromRow === toRow) {
    const step = toCol > fromCol ? 1 : -1;
    const cells: number[] = [];
    for (let c = fromCol + step; c !== toCol + step; c += step) {
      cells.push(fromRow * cols + c);
    }
    return cells;
  }
  if (fromCol === toCol) {
    const step = toRow > fromRow ? 1 : -1;
    const cells: number[] = [];
    for (let r = fromRow + step; r !== toRow + step; r += step) {
      cells.push(r * cols + fromCol);
    }
    return cells;
  }
  return null;
}

export function WordTracer({ board, onTrace, foundIndices = [], foundWordPaths, locked = false, onReset }: WordTracerProps) {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [lockedFlashIndex, setLockedFlashIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isTracingRef = useRef(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Canonical path ref — kept in sync with selectedIndices state so that
  // endTrace can read the current path directly without a setState callback.
  // This avoids calling onTrace (a socket emit) inside a setState updater,
  // which React StrictMode would double-invoke in development.
  const traceRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  const startTrace = useCallback(
    (clientX: number, clientY: number) => {
      if (locked || !containerRef.current) return;
      const idx = getCellIndexFromPoint(containerRef.current, clientX, clientY);
      if (idx !== null && foundIndices.includes(idx)) {
        // Tapped a locked cell: show shake + red flash, then cancel the trace.
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        setLockedFlashIndex(idx);
        flashTimerRef.current = setTimeout(() => setLockedFlashIndex(null), 300);
        return;
      }
      isTracingRef.current = true;
      if (idx !== null) {
        traceRef.current = [idx];
        setSelectedIndices([idx]);
      }
    },
    [locked, foundIndices],
  );

  const continueTrace = useCallback(
    (clientX: number, clientY: number) => {
      if (!isTracingRef.current || !containerRef.current) return;
      const idx = getCellIndexFromPoint(containerRef.current, clientX, clientY);
      if (idx === null) return;
      const prev = traceRef.current;
      if (prev.length === 0) return;
      if (prev.includes(idx)) return;

      // Fill cells skipped by fast drags: if the new cell is in the same row or
      // column as the last cell, interpolate all intermediate cells. This prevents
      // truncated paths that would spell incomplete words and get rejected.
      const filled = fillBetween(prev[prev.length - 1], idx, board.cols);
      if (filled === null) return; // Diagonal jump — ignore
      if (filled.some((c) => prev.includes(c))) return; // Would revisit a cell

      const next = [...prev, ...filled];
      traceRef.current = next;
      setSelectedIndices(next);
    },
    [board.cols],
  );

  const endTrace = useCallback(() => {
    if (!isTracingRef.current) return;
    isTracingRef.current = false;

    const current = traceRef.current;
    traceRef.current = [];
    setSelectedIndices([]);

    if (current.length > 0) {
      const word = current
        .map((idx) => {
          const row = Math.floor(idx / board.cols);
          const col = idx % board.cols;
          return board.letters[row]?.[col] ?? '';
        })
        .join('');
      // Only submit if the traced path actually spells a word on this board.
      // Guards against single-cell contact artifacts and truncated fast-drag
      // paths that would always be rejected by the server anyway.
      if (board.words.includes(word)) {
        onTrace(word, current);
      }
    }
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
    <div className="relative">
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ touchAction: 'none' }}
        className={locked ? 'cursor-default opacity-80' : 'cursor-pointer'}
      >
        <LetterBoard board={board} selectedIndices={selectedIndices} foundIndices={foundIndices} foundWordPaths={foundWordPaths} lockedFlashIndex={lockedFlashIndex} />
      </div>
      {onReset && !locked && (
        <button
          onClick={onReset}
          className="absolute bottom-0 right-0 translate-y-full pt-2 p-1.5 text-gray-400 hover:text-gray-700 active:text-gray-900 transition-colors touch-manipulation"
          title="Reset board"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
        </button>
      )}
    </div>
  );
}
