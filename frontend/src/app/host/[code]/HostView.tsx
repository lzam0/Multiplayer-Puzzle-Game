'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRoom } from '@/hooks/useRoom';
import { useSocket } from '@/hooks/useSocket';
import { QrJoin } from '@/components/QrJoin';
import { TopicSelector } from '@/components/TopicSelector';
import { LetterBoard } from '@/components/LetterBoard';
import { HostBoardPreview } from '@/components/HostBoardPreview';
import { RoundTimer } from '@/components/RoundTimer';
import { FinishTracker } from '@/components/FinishTracker';
import { RoundRankings } from '@/components/RoundRankings';
import { Podium } from '@/components/Podium';
import { BackButton } from '@/components/BackButton';
import { HowToPlay } from '@/components/HowToPlay';

const HOST_SENTINEL = '__host__';

interface HostViewProps {
  code: string;
}

export function HostView({ code }: HostViewProps) {
  const router = useRouter();
  const { connected } = useSocket();
  const {
    room,
    phase,
    errorMsg,
    board,
    topic,
    endsAt,
    roundIndex,
    totalRounds,
    isLastRound,
    finishers,
    roundRankings,
    podium,
    join,
    startGame,
    nextRound,
    endRound,
    endGame,
    kickPlayer,
  } = useRoom(code);

  const [selectedTopic, setSelectedTopic] = useState('Animals');
  const [joinUrl, setJoinUrl] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    const origin =
      process.env.NEXT_PUBLIC_HOST_ORIGIN ??
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3333');
    setJoinUrl(`${origin}/play/${code}`);
  }, [code]);

  useEffect(() => {
    if (connected && !hasJoined) {
      join(HOST_SENTINEL);
      setHasJoined(true);
    }
  }, [connected, hasJoined, join]);

  const competitors = room?.players.filter((p) => p.name !== HOST_SENTINEL) ?? [];

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-8 gap-8">
      <BackButton variant="dark" />
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

      {/* Room code + QR always visible in lobby */}
      {phase === 'lobby' && (
        <>
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

          <button
            onClick={() => setShowHowToPlay(true)}
            className="text-sm text-gray-400 underline hover:text-white transition-colors"
          >
            How to Play
          </button>

          <div className="w-full max-w-2xl space-y-6">
            <section className="bg-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-200">
                Players ({competitors.length})
              </h2>
              {competitors.length === 0 ? (
                <p className="text-gray-500 italic text-sm">No players yet…</p>
              ) : (
                <ul className="space-y-2">
                  {competitors.map((p) => (
                    <li key={p.id} className="group relative flex items-center justify-between bg-gray-700 rounded-xl px-4 py-3">
                      <span className="text-white font-medium">{p.name}</span>
                      {confirmingId === p.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-300">Remove {p.name}?</span>
                          <button
                            onClick={() => { kickPlayer(p.id); setConfirmingId(null); }}
                            className="px-3 py-1 text-sm font-bold bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmingId(null)}
                            className="px-3 py-1 text-sm font-bold bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmingId(p.id)}
                          aria-label={`Remove ${p.name}`}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-400 text-xl leading-none font-bold px-2"
                        >
                          ×
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="bg-gray-800 rounded-2xl p-6 flex flex-col gap-4">
              <h2 className="text-xl font-bold text-gray-200">Game Settings</h2>
              <div className="flex items-center gap-4">
                <label className="text-gray-300">Topic:</label>
                <TopicSelector value={selectedTopic} onChange={setSelectedTopic} />
              </div>
              <button
                onClick={() => startGame(selectedTopic)}
                disabled={!room || competitors.length === 0}
                className="w-full py-4 text-xl font-bold bg-green-500 hover:bg-green-400 disabled:opacity-40 rounded-xl transition-colors"
              >
                Start Game
              </button>
            </section>
          </div>
        </>
      )}

      {/* Host preview — 5s board before players get it */}
      {phase === 'preview' && board && (
        <HostBoardPreview
          board={board}
          topic={topic ?? ''}
          roundIndex={roundIndex}
          totalRounds={totalRounds}
        />
      )}

      {/* Round in progress */}
      {phase === 'active' && board && endsAt !== null && (
        <div className="w-full max-w-5xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm uppercase tracking-widest">
                Round {roundIndex + 1} of {totalRounds}
              </p>
              <p className="text-3xl font-bold">{topic}</p>
            </div>
            <RoundTimer endsAt={endsAt} />
          </div>

          <div className="bg-gray-800 rounded-2xl p-6 flex flex-col items-center gap-2">
            <p className="text-sm uppercase tracking-widest text-gray-400">Reference Board</p>
            <LetterBoard board={board} cellSize="lg" />
          </div>

          <div className="bg-gray-800 rounded-2xl p-6">
            <FinishTracker finishers={finishers} totalPlayers={competitors.length} />
          </div>

          <button
            onClick={endRound}
            className="w-full py-3 text-lg font-bold bg-red-600 hover:bg-red-500 rounded-xl transition-colors"
          >
            End Round Early
          </button>
        </div>
      )}

      {/* Between rounds */}
      {phase === 'round-result' && (
        <div className="w-full max-w-2xl space-y-6">
          <div className="bg-gray-800 rounded-2xl p-6 text-white">
            <RoundRankings rankings={roundRankings} roundIndex={roundIndex} />
          </div>

          {!isLastRound && (
            <div className="bg-gray-800 rounded-2xl p-6 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <label className="text-gray-300">Next Topic:</label>
                <TopicSelector value={selectedTopic} onChange={setSelectedTopic} />
              </div>
              <button
                onClick={() => nextRound(selectedTopic)}
                className="w-full py-4 text-xl font-bold bg-green-500 hover:bg-green-400 rounded-xl transition-colors"
              >
                Start Round {roundIndex + 2}
              </button>
            </div>
          )}

          <button
            onClick={endGame}
            className="w-full py-3 text-lg font-bold bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors"
          >
            End Game &amp; Show Podium
          </button>
        </div>
      )}

      {/* Final podium */}
      {phase === 'game-over' && (
        <div className="w-full max-w-2xl">
          <div className="bg-gray-800 rounded-2xl p-8">
            <Podium podium={podium} />
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

      {showHowToPlay && <HowToPlay onClose={() => setShowHowToPlay(false)} />}
    </main>
  );
}
