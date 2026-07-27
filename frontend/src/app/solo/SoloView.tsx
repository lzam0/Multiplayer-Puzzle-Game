'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LetterGrid, WordPath } from '@/lib/types';
import { WordTracer } from '@/components/WordTracer';
import { WordCounter } from '@/components/WordCounter';
import { useStopwatch } from '@/hooks/useStopwatch';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8888';

const WORD_COLORS = [
  '#f87171',
  '#fb923c',
  '#facc15',
  '#4ade80',
  '#34d399',
  '#60a5fa',
  '#a78bfa',
  '#f472b6',
];

type SoloPhase = 'topic-entry' | 'loading' | 'playing' | 'round-result';

function formatMs(ms: number): string {
  const totalTenths = Math.floor(ms / 100);
  const tenths = totalTenths % 10;
  const totalSecs = Math.floor(ms / 1000);
  const secs = totalSecs % 60;
  const mins = Math.floor(totalSecs / 60);
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  return `${mm}:${ss}.${tenths}`;
}

export function SoloView() {
  const router = useRouter();

  const [phase, setPhase] = useState<SoloPhase>('topic-entry');
  const [topicInput, setTopicInput] = useState('');
  const [board, setBoard] = useState<LetterGrid | null>(null);
  const [topic, setTopic] = useState('');
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [foundWordPaths, setFoundWordPaths] = useState<WordPath[]>([]);
  const [roundTime, setRoundTime] = useState(0);
  const [totalMs, setTotalMs] = useState(0);
  const [sessionBest, setSessionBest] = useState<number | null>(null);
  const [newBest, setNewBest] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { elapsed, start: stopwatchStart, stop: stopwatchStop, reset: stopwatchReset } = useStopwatch();

  const startRound = async () => {
    setPhase('loading');
    setErrorMsg(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(
        `${BACKEND_URL}/game/board?topic=${encodeURIComponent(topicInput)}`,
        { signal: controller.signal },
      );
      if (!res.ok) throw new Error('Failed to generate board');
      const { board: newBoard } = (await res.json()) as { board: LetterGrid };
      setBoard(newBoard);
      setTopic(topicInput);
      setFoundWords([]);
      setFoundWordPaths([]);
      stopwatchReset();
      stopwatchStart();
      setPhase('playing');
    } catch {
      setErrorMsg('Could not generate board — try a different topic.');
      setPhase('topic-entry');
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const handleTrace = (word: string, letterIndices: number[]) => {
    if (!board) return;
    if (foundWords.includes(word)) return;
    if (!board.words.includes(word)) return;
    const colorIndex = board.words.indexOf(word);
    const color = WORD_COLORS[colorIndex % WORD_COLORS.length];
    setFoundWordPaths((prev) => [...prev, { word, indices: letterIndices, color }]);
    setFoundWords((prev) => {
      const next = [...prev, word];
      if (next.length === board.words.length) {
        const elapsed = stopwatchStop();
        setRoundTime(elapsed);
        setTotalMs((t) => t + elapsed);
        setNewBest(sessionBest === null || elapsed < sessionBest);
        if (sessionBest === null || elapsed < sessionBest) setSessionBest(elapsed);
        setPhase('round-result');
      }
      return next;
    });
  };

  const handleNextRound = () => {
    setTopicInput('');
    setBoard(null);
    setPhase('topic-entry');
  };

  const resetBoard = () => {
    setFoundWords([]);
    setFoundWordPaths([]);
  };

  const wordColors = Object.fromEntries(foundWordPaths.map((p) => [p.word, p.color]));
  const foundWordIndices = foundWordPaths.flatMap((p) => p.indices);

  return (
    <main className="min-h-screen bg-white flex flex-col items-center p-4 gap-6 max-w-md mx-auto">
      <div className="text-center pt-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-blue-600">WEND</h1>
        <p className="mt-1 text-gray-500 text-sm">Solo</p>
      </div>

      {errorMsg && (
        <div className="w-full bg-red-100 text-red-700 rounded-lg px-4 py-3 text-sm">
          {errorMsg}
        </div>
      )}

      {phase === 'topic-entry' && (
        <div className="flex flex-col items-center gap-6 w-full flex-1 justify-center">
          <p className="text-gray-600 text-base text-center">Enter a topic to generate a word puzzle.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (topicInput.trim()) startRound();
            }}
            className="flex flex-col gap-4 w-full"
          >
            <input
              type="text"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              placeholder="Enter a topic…"
              autoFocus
              className="w-full px-4 py-4 text-xl text-center border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!topicInput.trim()}
              className="w-full py-4 text-xl font-bold text-white bg-blue-600 rounded-2xl hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              Start
            </button>
          </form>
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 text-sm underline"
          >
            Back to Home
          </button>
        </div>
      )}

      {phase === 'loading' && (
        <div className="flex flex-col items-center justify-center flex-1 gap-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Generating board…</p>
        </div>
      )}

      {phase === 'playing' && board && (
        <div className="flex flex-col gap-4 w-full">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Topic</p>
              <p className="font-bold text-lg">{topic}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Time</p>
              <p className="font-mono text-2xl font-bold text-blue-600">{formatMs(elapsed)}</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <WordTracer
              board={board}
              onTrace={handleTrace}
              foundIndices={foundWordIndices}
              foundWordPaths={foundWordPaths}
              onReset={resetBoard}
            />
          </div>

          <WordCounter words={board.words} foundWords={foundWords} wordColors={wordColors} />
        </div>
      )}

      {phase === 'round-result' && (
        <div className="flex flex-col items-center gap-6 w-full flex-1 justify-center">
          <div className="w-full bg-green-50 border-2 border-green-300 rounded-2xl p-6 flex flex-col gap-4">
            <p className="text-green-700 font-bold text-xl text-center">Round complete!</p>

            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Time</span>
                <span className="font-mono font-bold text-gray-900">{formatMs(roundTime)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Session best</span>
                <span className="flex items-center gap-2">
                  <span className="font-mono font-bold text-gray-900">
                    {sessionBest !== null ? formatMs(sessionBest) : '—'}
                  </span>
                  {newBest && (
                    <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">
                      New best!
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total so far</span>
                <span className="font-mono font-bold text-gray-900">{formatMs(totalMs)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={handleNextRound}
              className="w-full py-4 text-xl font-bold text-white bg-blue-600 rounded-2xl hover:bg-blue-700 transition-colors"
            >
              Next Round
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 text-lg font-bold text-blue-600 border-2 border-blue-600 rounded-xl hover:bg-blue-50 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
