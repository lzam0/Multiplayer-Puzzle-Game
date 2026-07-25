'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRoom } from '@/hooks/useRoom';
import { useSocket } from '@/hooks/useSocket';
import { LobbyList } from '@/components/LobbyList';
import { WordTracer } from '@/components/WordTracer';
import { FoundWords } from '@/components/FoundWords';
import { Scoreboard } from '@/components/Scoreboard';
import { Feedback } from '@/components/Feedback';

interface PlayerViewProps {
  code: string;
}

export function PlayerView({ code }: PlayerViewProps) {
  const router = useRouter();
  const { socket, connected } = useSocket();
  const [nameInput, setNameInput] = useState('');
  const [myName, setMyName] = useState<string | null>(null);

  const { room, feedback, scores, errorMsg, join, traceWord, leave } = useRoom(
    code,
    myName,
  );

  // Derive phase from room state
  const currentPhase = (() => {
    if (!myName) return 'name-entry';
    if (!room) return 'lobby';
    if (room.status === 'finished') return 'game-over';
    if (room.status === 'in_progress') return 'game';
    return 'lobby';
  })();

  const handleJoin = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const name = nameInput.trim();
      if (!name) return;
      setMyName(name);
      join(name);
    },
    [nameInput, join],
  );

  const handleLeave = useCallback(() => {
    leave();
    router.push('/');
  }, [leave, router]);

  const myPlayer = room?.players.find((p) => p.id === socket.id);

  return (
    <main className="min-h-screen bg-white flex flex-col items-center p-4 gap-6 max-w-md mx-auto">
      {!connected && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-400 text-black text-center py-2 font-bold z-50 text-sm">
          Reconnecting…
        </div>
      )}

      <Feedback feedback={feedback} />

      {errorMsg && (
        <div className="w-full bg-red-100 text-red-700 rounded-lg px-4 py-3 text-sm">
          {errorMsg}
        </div>
      )}

      {currentPhase === 'name-entry' && (
        <div className="flex flex-col items-center justify-center flex-1 gap-6 w-full">
          <div className="text-center">
            <p className="text-gray-500 text-sm">Room</p>
            <h1 className="text-4xl font-extrabold font-mono text-blue-600">{code}</h1>
          </div>
          <form onSubmit={handleJoin} className="flex flex-col gap-4 w-full">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Your name"
              maxLength={20}
              autoFocus
              className="w-full px-4 py-4 text-xl text-center border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!nameInput.trim() || !connected}
              className="w-full py-4 text-xl font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              Join
            </button>
          </form>
        </div>
      )}

      {currentPhase === 'lobby' && (
        <div className="flex flex-col items-center justify-center flex-1 gap-6 w-full">
          <div className="text-center">
            <p className="text-gray-500 text-sm">Room</p>
            <h1 className="text-4xl font-extrabold font-mono text-blue-600">{code}</h1>
          </div>
          <div className="w-full bg-gray-50 rounded-2xl p-4">
            <h2 className="font-bold text-gray-700 mb-3">
              Players ({room?.players.length ?? 0})
            </h2>
            {room ? (
              <LobbyList players={room.players} />
            ) : (
              <p className="text-gray-400 italic text-sm">Joining…</p>
            )}
          </div>
          <p className="text-gray-500 italic text-sm">Waiting for host to start the game…</p>
          <button
            onClick={handleLeave}
            className="text-red-500 text-sm underline"
          >
            Leave Room
          </button>
        </div>
      )}

      {currentPhase === 'game' && room && (
        <div className="flex flex-col gap-4 w-full">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Topic</p>
              <p className="font-bold text-lg">{room.topic}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Your Score</p>
              <p className="font-bold text-2xl text-blue-600">
                {myPlayer?.score ?? 0}
              </p>
            </div>
          </div>

          {room.board ? (
            <div className="flex flex-col items-center gap-4">
              <WordTracer board={room.board} onTrace={traceWord} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500 italic">Game starting — board loading…</p>
            </div>
          )}

          <div>
            <h2 className="font-bold text-gray-700 mb-2 text-sm">Found Words</h2>
            <FoundWords words={room.foundWords} />
          </div>

          <button
            onClick={handleLeave}
            className="text-red-500 text-sm underline mt-2"
          >
            Leave Game
          </button>
        </div>
      )}

      {currentPhase === 'game-over' && (
        <div className="flex flex-col items-center gap-6 w-full flex-1 justify-center">
          <h1 className="text-3xl font-extrabold text-gray-800">Game Over!</h1>
          <Scoreboard scores={scores} />
          <button
            onClick={() => router.push('/')}
            className="w-full py-4 text-xl font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
          >
            Play Again
          </button>
        </div>
      )}
    </main>
  );
}
