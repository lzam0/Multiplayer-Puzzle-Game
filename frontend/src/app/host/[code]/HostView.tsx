'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRoom } from '@/hooks/useRoom';
import { useSocket } from '@/hooks/useSocket';
import { LobbyList } from '@/components/LobbyList';
import { QrJoin } from '@/components/QrJoin';
import { TopicSelector } from '@/components/TopicSelector';
import { Scoreboard } from '@/components/Scoreboard';
import { FoundWords } from '@/components/FoundWords';

const HOST_SENTINEL = '__host__';

interface HostViewProps {
  code: string;
}

export function HostView({ code }: HostViewProps) {
  const router = useRouter();
  const { connected } = useSocket();
  const { room, scores, errorMsg, join, startGame } = useRoom(code, null);
  const [topic, setTopic] = useState('Animals');
  const [joinUrl, setJoinUrl] = useState('');
  const [hasJoined, setHasJoined] = useState(false);

  useEffect(() => {
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'http://localhost:3333';
    setJoinUrl(`${origin}/play/${code}`);
  }, [code]);

  // Join socket room as host sentinel so we receive broadcasts
  useEffect(() => {
    if (connected && !hasJoined) {
      join(HOST_SENTINEL);
      setHasJoined(true);
    }
  }, [connected, hasJoined, join]);

  const handleStartGame = () => {
    startGame(topic);
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-8 gap-8">
      {!connected && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black text-center py-2 font-bold z-50">
          Reconnecting…
        </div>
      )}

      {errorMsg && (
        <div className="w-full max-w-2xl bg-red-600 text-white rounded-lg px-4 py-3">
          {errorMsg}
        </div>
      )}

      <div className="text-center">
        <p className="text-gray-400 text-sm uppercase tracking-widest">Room Code</p>
        <h1 className="text-8xl font-extrabold tracking-widest text-white font-mono">
          {code}
        </h1>
      </div>

      {joinUrl && (
        <div className="bg-white rounded-2xl p-4">
          <QrJoin url={joinUrl} />
        </div>
      )}

      {room?.status === 'waiting' && (
        <div className="w-full max-w-2xl space-y-6">
          <section className="bg-gray-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-200">
              Players ({room.players.filter((p) => p.name !== HOST_SENTINEL).length})
            </h2>
            <LobbyList players={room.players} filterSentinel />
          </section>

          <section className="bg-gray-800 rounded-2xl p-6 flex flex-col gap-4">
            <h2 className="text-xl font-bold text-gray-200">Game Settings</h2>
            <div className="flex items-center gap-4">
              <label className="text-gray-300">Topic:</label>
              <TopicSelector value={topic} onChange={setTopic} />
            </div>
            <button
              onClick={handleStartGame}
              disabled={!room || room.players.filter((p) => p.name !== HOST_SENTINEL).length === 0}
              className="w-full py-4 text-xl font-bold bg-green-500 hover:bg-green-400 disabled:opacity-40 rounded-xl transition-colors"
            >
              Start Game
            </button>
          </section>
        </div>
      )}

      {room?.status === 'in_progress' && (
        <div className="w-full max-w-2xl space-y-6">
          <div className="bg-gray-800 rounded-2xl p-6 text-center">
            <p className="text-gray-400 text-sm uppercase tracking-widest mb-1">Topic</p>
            <p className="text-3xl font-bold">{room.topic}</p>
          </div>

          {room.board ? (
            <div className="bg-gray-800 rounded-2xl p-6 text-center">
              <p className="text-gray-300">Board available</p>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-2xl p-6 text-center">
              <p className="text-gray-400 italic">Game in progress — board generating…</p>
            </div>
          )}

          <section className="bg-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-3 text-gray-200">Found Words</h2>
            <FoundWords words={room.foundWords} />
          </section>

          <section className="bg-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-3 text-gray-200">Live Scores</h2>
            <LobbyList players={room.players} filterSentinel />
          </section>
        </div>
      )}

      {room?.status === 'finished' && (
        <div className="w-full max-w-2xl">
          <div className="bg-gray-800 rounded-2xl p-8">
            <Scoreboard scores={scores} />
            <button
              onClick={() => router.push('/')}
              className="mt-6 w-full py-3 text-lg font-bold bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors"
            >
              New Game
            </button>
          </div>
        </div>
      )}

      {!room && connected && (
        <div className="text-gray-400 italic">Connecting to room…</div>
      )}
    </main>
  );
}
