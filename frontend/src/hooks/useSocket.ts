'use client';

import { Socket } from 'socket.io-client';
import { useSocketContext } from '@/context/SocketProvider';

interface UseSocketReturn {
  socket: Socket;
  connected: boolean;
}

export function useSocket(): UseSocketReturn {
  const { socket, connected } = useSocketContext();
  return { socket, connected };
}
