'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

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
      <div className="text-center">
        <h1 className="text-6xl font-extrabold tracking-tight text-blue-600">
          WEND
        </h1>
        <p className="mt-2 text-lg text-gray-600">Multiplayer Word Puzzle</p>
      </div>

      <div className="flex flex-col gap-8 w-full max-w-sm">
        <button
          onClick={handleCreateRoom}
          disabled={creating}
          className="w-full py-4 text-xl font-bold text-white bg-blue-600 rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {creating ? 'Creating…' : 'Create Room'}
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
            disabled={!joinCode.trim()}
            className="w-full py-3 text-lg font-bold text-blue-600 border-2 border-blue-600 rounded-xl hover:bg-blue-50 disabled:opacity-40 transition-colors"
          >
            Join Room
          </button>
        </form>
      </div>
    </main>
  );
}
