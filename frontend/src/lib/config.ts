// Server-side URL for Next.js Route Handlers (not exposed to browser)
export const BACKEND_URL =
  process.env.BACKEND_URL ?? 'http://localhost:8888';

// Browser-side WebSocket URL (NEXT_PUBLIC_ prefix makes it available client-side)
export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:8888';
