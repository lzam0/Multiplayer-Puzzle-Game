# Implementation Brief: Orchestrator → Implementer
**Branch:** feature/frontend
**Date:** 2026-07-25
**Iteration:** 0

## Feature
Build the complete Next.js 14 (App Router) + Tailwind + socket.io-client frontend for the WEND multiplayer word puzzle game, in the empty dir `/Users/leihl/Documents/Project/Multiplayer-Puzzle-Game/frontend/`. Three routes: home, host view (large screen), player view (mobile). Backend is already built (NestJS); do NOT modify it.

## Plan
Plan file path: `/Users/leihl/.claude/plans/lets-create-a-front-shiny-hennessy-agent-ad236320fb7344816.md`
Read it in full — it contains verified ground truth about the backend and the exact file list.

Summary:
- Scaffold Next.js 14 App Router + TypeScript + Tailwind manually (non-interactive) inside `frontend/`.
- **Ports: frontend on 3333 (`next dev -p 3333` / `next start -p 3333`), backend on 8888.** URLs env-driven, default to `http://localhost:8888`.
- REST (`POST /lobby`, `GET /lobby/:code`) reached via Next Route Handlers under `src/app/api/lobby/` that fetch the backend server-side (backend has NO REST CORS — do not fetch backend directly from the browser).
- Singleton socket.io-client via `SocketProvider` context + `useSocket`/`useRoom` hooks; graceful reconnect banner. WS gateway CORS is `*`, so direct browser socket to :8888 is fine.
- `game_started` payload is `{ topic: string }` (verified in backend code) — board is deferred; render a placeholder on host AND player when `status==='in_progress'` and `board` is undefined. Guard ALL board access.
- Host view (`/host/[code]`): big room code, QR code (qrcode lib) to `${origin}/play/[code]`, live lobby list, topic dropdown (Animals, Foods, Countries, Colors, Sports), Start Game (emits `start_game`), in-progress + game-over states. Host joins socket room under a filtered sentinel identity (e.g. name `__host__`) filtered out of the visible player list.
- Player view (`/play/[code]`): name entry → `join_room` → lobby wait → on `game_started` show LetterBoard + pointer/touch-drag WordTracer emitting `trace_word` (or placeholder if no board) → found words, own score, correct/incorrect Feedback → scoreboard on `game_over`. Leave button emits `leave_room`.
- `lib/types.ts` mirrors backend `game.types.ts` plus all server→client event payloads.

## Branch
`feature/frontend` — already created.

## Verification (all must pass before handoff)
- `npm install` in `frontend/`
- `npx tsc --noEmit` → PASS
- `npm run lint` → PASS
- `npm run build` → PASS

## Priority
Build exactly what the plan specifies. Do NOT modify the backend. Do NOT add scope. Do NOT commit (the orchestrator handles commit/merge after review). If the plan is ambiguous or impossible as written, write an error file under `.claude/comms/errors/` and escalate.
Write your outgoing handoff to `.claude/comms/handoffs/feature-frontend/implementer-to-reviewer.md`.
