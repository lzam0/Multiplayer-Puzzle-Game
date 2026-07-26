'use client';

import type { Player } from '@/lib/types';

const HOST_SENTINEL = '__host__';

interface LobbyListProps {
  players: Player[];
  filterSentinel?: boolean;
}

export function LobbyList({ players, filterSentinel = false }: LobbyListProps) {
  const visible = filterSentinel
    ? players.filter((p) => p.name !== HOST_SENTINEL)
    : players;

  if (visible.length === 0) {
    return <p className="text-gray-500 italic">No players yet…</p>;
  }

  return (
    <ul className="space-y-1">
      {visible.map((p) => (
        <li key={p.id} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="font-medium">{p.name}</span>
        </li>
      ))}
    </ul>
  );
}
