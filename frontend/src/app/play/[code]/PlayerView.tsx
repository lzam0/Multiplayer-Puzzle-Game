'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRoom } from '@/hooks/useRoom';
import { useSocket } from '@/hooks/useSocket';
import { LobbyList } from '@/components/LobbyList';
import { WordTracer } from '@/components/WordTracer';
import { WordCounter } from '@/components/WordCounter';
import { Feedback } from '@/components/Feedback';
import { RoundRankings } from '@/components/RoundRankings';
import { Podium } from '@/components/Podium';

const HOST_SENTINEL = '__host__';

interface PlayerViewProps {
  code: string;
}

export function PlayerView({ code }: PlayerViewProps) {
  const router = useRouter();
  const { connected } = useSocket();
  const [nameInput, setNameInput] = useState('');
  const [myName, setMyName] = useState<string | null>(null);

  const {
    room,
    phase,
    feedback,
    errorMsg,
    board,
    topic,
    foundWords,
    foundWordIndices,
    playerFinished,
    roundRankings,
    roundIndex,
    isLastRound,
    podium,
    join,
    traceWord,
    resetBoard,
    leave,
  } = useRoom(code);

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

  const visiblePlayers = room?.players.filter((p) => p.name !== HOST_SENTINEL) ?? [];

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

      {/* Name entry */}
      {!myName && (
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

      {/* Lobby — waiting for host to start */}
      {myName && phase === 'lobby' && (
        <div className="flex flex-col items-center justify-center flex-1 gap-6 w-full">
          <div className="text-center">
            <p className="text-gray-500 text-sm">Room</p>
            <h1 className="text-4xl font-extrabold font-mono text-blue-600">{code}</h1>
          </div>
          <div className="w-full bg-gray-50 rounded-2xl p-4">
            <h2 className="font-bold text-gray-700 mb-3">
              Players ({visiblePlayers.length})
            </h2>
            {room ? (
              <LobbyList players={visiblePlayers} />
            ) : (
              <p className="text-gray-400 italic text-sm">Joining…</p>
            )}
          </div>
          <p className="text-gray-500 italic text-sm">Waiting for host to start the game…</p>
          <button onClick={handleLeave} className="text-red-500 text-sm underline">
            Leave Room
          </button>
        </div>
      )}

      {/* Round active — interactive board */}
      {myName && phase === 'active' && board && (
        <div className="flex flex-col gap-4 w-full">
          <div>
            <p className="text-xs text-gray-500">Topic</p>
            <p className="font-bold text-lg">{topic}</p>
          </div>

          {playerFinished ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-full bg-green-50 border-2 border-green-300 rounded-xl p-4 text-center">
                <p className="text-green-700 font-bold text-lg">Done!</p>
                <p className="text-green-600 text-sm">Waiting for other players…</p>
              </div>
              <WordTracer
                board={board}
                onTrace={traceWord}
                foundIndices={foundWordIndices}
                locked
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <WordTracer
                board={board}
                onTrace={traceWord}
                foundIndices={foundWordIndices}
              />
              <button
                onClick={resetBoard}
                className="text-gray-400 text-xs underline"
              >
                Reset board highlights
              </button>
            </div>
          )}

          <WordCounter words={board.words} foundWords={foundWords} />

          <button onClick={handleLeave} className="text-red-500 text-sm underline mt-2">
            Leave Game
          </button>
        </div>
      )}

      {/* Between rounds */}
      {myName && phase === 'round-result' && (
        <div className="flex flex-col gap-6 w-full flex-1 justify-center">
          <div className="bg-gray-900 text-white rounded-2xl p-6">
            <RoundRankings rankings={roundRankings} roundIndex={roundIndex} />
          </div>
          {isLastRound ? (
            <p className="text-center text-gray-500 italic text-sm">Waiting for host to end the game…</p>
          ) : (
            <p className="text-center text-gray-500 italic text-sm">Waiting for next round…</p>
          )}
        </div>
      )}

      {/* Final podium */}
      {myName && phase === 'game-over' && (
        <div className="flex flex-col items-center gap-6 w-full flex-1 justify-center">
          <div className="bg-gray-900 text-white rounded-2xl p-6 w-full">
            <Podium podium={podium} />
          </div>
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
