const BACKEND_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8888';

// Server-side URL for Next.js Route Handlers (not exposed to browser)
export const BACKEND_URL = BACKEND_BASE;

// Browser-side WebSocket URL (NEXT_PUBLIC_ prefix makes it available client-side)
export const WS_URL = BACKEND_BASE;
