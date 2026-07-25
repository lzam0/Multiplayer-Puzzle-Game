'use client';

import { useParams } from 'next/navigation';
import { SocketProvider } from '@/context/SocketProvider';
import { HostView } from './HostView';

export default function HostPage() {
  const params = useParams<{ code: string }>();
  const code = params.code;

  return (
    <SocketProvider>
      <HostView code={code} />
    </SocketProvider>
  );
}
