'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BACKEND_URL } from '@/lib/config';

type ServerStatus = 'checking' | 'warming' | 'ready';

function useServerStatus() {
  const [status, setStatus] = useState<ServerStatus>('checking');

  useEffect(() => {
    let cancelled = false;

    // After 1.5s without a response, show the warming-up banner
    const warmingTimer = setTimeout(() => {
      if (!cancelled) setStatus('warming');
    }, 1500);

    async function ping() {
      while (!cancelled) {
        try {
          const res = await fetch(`${BACKEND_URL}/`, { signal: AbortSignal.timeout(10_000) });
          if (res.ok && !cancelled) {
            clearTimeout(warmingTimer);
            setStatus('ready');
            return;
          }
        } catch {
          // server not yet up, retry
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    ping();
    return () => {
      cancelled = true;
      clearTimeout(warmingTimer);
    };
  }, []);

  return status;
}

export default function HomePage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const serverStatus = useServerStatus();

  async function handleCreateRoom() {
    setCreating(true);
    try {
      const res = await fetch('/api/lobby', { method: 'POST' });
      if (!res.ok) {
        throw new Error('Failed to create room');
      }
      const data = (await res.json()) as { code: string };
      router.push(`/host/${data.code}`);
    } catch {
      setCreating(false);
    }
  }

  async function handleJoinRoom(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;

    try {
      const res = await fetch(`/api/lobby/${code}`);
      if (!res.ok) {
        setJoinError('Room not found');
        return;
      }
      setJoinError(null);
      router.push(`/play/${code}`);
    } catch {
      setJoinError('Could not connect to server');
    }
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-12 p-8">
      {serverStatus === 'warming' && (
        <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-3 bg-amber-50 border-b border-amber-200 px-4 py-3 text-sm text-amber-800">
          <svg className="animate-spin h-4 w-4 shrink-0 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Server is warming up — this can take up to 60 seconds on first load.</span>
        </div>
      )}

      <div className="text-center">
        <h1 className="text-6xl font-extrabold tracking-tight text-blue-600">
          WEND
        </h1>
        <p className="mt-2 text-lg text-gray-600">Multiplayer Word Puzzle</p>
      </div>

      <div className="flex flex-col gap-8 w-full max-w-sm">
        <button
          onClick={handleCreateRoom}
          disabled={creating || serverStatus !== 'ready'}
          className="w-full py-4 text-xl font-bold text-white bg-blue-600 rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {creating ? 'Creating…' : serverStatus !== 'ready' ? 'Waiting for server…' : 'Create Room'}
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-gray-50 px-2 text-gray-500">or</span>
          </div>
        </div>

        <form onSubmit={handleJoinRoom} className="flex flex-col gap-3">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => {
              setJoinCode(e.target.value.toUpperCase());
              setJoinError(null);
            }}
            placeholder="Enter room code"
            maxLength={8}
            className="w-full px-4 py-3 text-xl text-center font-mono border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
          />
          {joinError && (
            <p className="text-red-500 text-sm text-center">{joinError}</p>
          )}
          <button
            type="submit"
            disabled={!joinCode.trim() || serverStatus !== 'ready'}
            className="w-full py-3 text-lg font-bold text-blue-600 border-2 border-blue-600 rounded-xl hover:bg-blue-50 disabled:opacity-40 transition-colors"
          >
            Join Room
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-gray-50 px-2 text-gray-500">or</span>
          </div>
        </div>

        <button
          onClick={() => router.push('/solo')}
          disabled={serverStatus !== 'ready'}
          className="w-full py-3 text-lg font-bold text-gray-700 border-2 border-gray-300 rounded-xl hover:bg-gray-100 disabled:opacity-40 transition-colors"
        >
          Solo
        </button>
      </div>
    </main>
  );
}
