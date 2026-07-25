'use client';

import { useParams } from 'next/navigation';
import { SocketProvider } from '@/context/SocketProvider';
import { PlayerView } from './PlayerView';

export default function PlayPage() {
  const params = useParams<{ code: string }>();
  const code = params.code;

  return (
    <SocketProvider>
      <PlayerView code={code} />
    </SocketProvider>
  );
}
