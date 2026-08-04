import type { Socket } from 'socket.io-client';

let registered = false;

export function initErrorReporter(socket: Socket): void {
  if (registered) return;
  registered = true;

  const emit = (message: string, stack?: string) => {
    if (!socket.connected) return;
    socket.emit('client_error', {
      message,
      stack,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });
  };

  window.onerror = (_event, _source, _lineno, _colno, error) => {
    emit(error?.message ?? String(_event), error?.stack);
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;
    emit(message, stack);
  });
}
