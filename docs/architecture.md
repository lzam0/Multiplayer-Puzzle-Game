# Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        HOST SCREEN                          │
│              (Big screen / browser at localhost:3333)       │
│   Shows: QR code, room code, lobby, reference board, timer  │
└────────────────────────┬────────────────────────────────────┘
                         │ WebSocket (Socket.io)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    NESTJS BACKEND                           │
│                   localhost:8888                             │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  REST API   │  │  WS Gateway  │  │   Game Engine    │  │
│  │  /lobby     │  │  (Socket.io) │  │  (in-memory      │  │
│  │  /qr        │  │              │  │   state)         │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  TopicsService — Groq API (llama-3.3-70b-versatile)  │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │ WebSocket (Socket.io)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    PLAYER DEVICES                           │
│           (Mobile browsers at localhost:3333/play)          │
│   Shows: name entry, sparse board, word tracer, counter     │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### No Database
All game state is held in-memory on the NestJS server using a `Map<roomCode, GameRoom>`. When the server restarts, all rooms are cleared. This is intentional — games are short-lived local sessions.

### In-Memory Room State
Each room holds:
- Room code (4-digit string)
- Host socket ID (bound via `claimHost` when `__host__` joins)
- List of connected players (`id`, `name`, `totalTimeMs`, `roundsCounted`)
- Current round (`currentRound`) with phase, board, `goLiveAt`, `endsAt`, per-player state
- `LetterGrid` — sparse: `letters: string[][]` where non-word cells are `''`

### Two Frontend Views
- **Host view** (`/host/[code]`) — designed for a large shared screen. Shows QR code, lobby, 5s board preview, large reference board during active rounds, finish tracker, round rankings, final podium.
- **Player view** (`/play/[code]`) — designed for mobile. Shows the sparse letter grid, word tracer, `WordCounter` progress panel, round rankings, final podium.

### Host Sentinel Pattern
The host browser joins the Socket.io room as player name `__host__`. This lets the host receive all game broadcasts (including `round_starting`, which players do not receive) without appearing in the player list or competing. When `__host__` joins, the gateway calls `LobbyService.claimHost(code, socketId)` to bind the host socket ID — required for `start_game` / `end_round` / `end_game` guards to pass.

### WebSocket-First
All real-time game events go through Socket.io. The REST API is only used for room creation and QR code generation.

### Dynamic Topic Generation
Topics are generated on demand by the Groq API (`llama-3.3-70b-versatile`) rather than loaded from a hardcoded file. The host types any free-text topic; the backend fetches 4–7 curated words, filters them, and generates the board. If Groq returns too few valid words, the host receives an `error` event and can try a different topic.

## Module Breakdown

### Backend (`backend/src/`)

| File | Purpose | Status |
|---|---|---|
| `lobby/lobby.service.ts` | Room creation, code generation, player management, round lifecycle | ✓ Done |
| `lobby/lobby.controller.ts` | `POST /lobby`, `GET /lobby/:code` | ✓ Done |
| `game/game.service.ts` | Sparse grid generation, word validation, round ranking | ✓ Done |
| `game/game.controller.ts` | `GET /game/board?topic=` — REST endpoint for solo mode board generation | ✓ Done |
| `game/game.types.ts` | `Room`, `Player`, `LetterGrid`, `Round`, `RoundRankEntry`, `PodiumEntry` interfaces | ✓ Done |
| `game/game.constants.ts` | `PREVIEW_MS`, `ROUND_DURATION_MS`, `MAX_ROUNDS`, `NON_FINISH_PENALTY_MS`, `MAX_TRACE_PER_SEC`, `GEN_TIME_BUDGET_MS`, `MAX_GEN_ATTEMPTS` | ✓ Done |
| `gateway/game.gateway.ts` | All WebSocket event handlers; async round-start with Groq fetch | ✓ Done |
| `topics/topics.service.ts` | `generateWords(topic)` — Groq API call + validation pipeline | ✓ Done |
| `app.module.ts` | Root module wiring all submodules | ✓ Done |
| `main.ts` | Bootstrap; loads `.env` via `dotenv/config`, enables CORS `*`, listens on port 8888 | ✓ Done |

### Frontend (`frontend/src/`)

| File | Purpose | Status |
|---|---|---|
| `app/host/[code]/HostView.tsx` | Host phase machine: lobby → preview → active → round-result → game-over | ✓ Done |
| `app/play/[code]/PlayerView.tsx` | Player phase machine: name-entry → lobby → active → round-result → game-over | ✓ Done |
| `app/solo/SoloView.tsx` | Solo phase machine: topic-entry → loading → playing → round-result; client-side word validation, session best | ✓ Done |
| `app/solo/page.tsx` | Route wrapper for `/solo` | ✓ Done |
| `hooks/useRoom.ts` | Socket event wiring, all game state, `pendingTraceRef` pattern for cell highlighting | ✓ Done |
| `hooks/useSocket.ts` | Singleton Socket.io connection | ✓ Done |
| `hooks/useStopwatch.ts` | Client-side stopwatch (start/stop/reset, 100ms tick) — used by solo mode | ✓ Done |
| `lib/types.ts` | Frontend mirror of backend types (`Player.totalTimeMs`, `RoundRankEntry`, `PodiumEntry`, etc.) | ✓ Done |
| `lib/format.ts` | `formatMs(ms)` — shared time formatter | ✓ Done |
| `lib/config.ts` | `BACKEND_URL` constant from env or fallback | ✓ Done |
| `context/SocketProvider.tsx` | Socket.io context provider | ✓ Done |
| `components/LetterBoard.tsx` | Sparse grid renderer; grey inert tiles for `''` cells; `cellSize` prop | ✓ Done |
| `components/WordTracer.tsx` | Touch/mouse drag trace; SVG stroke overlay for found words; reset button bottom-right | ✓ Done |
| `components/WordCounter.tsx` | Letter-slot boxes sorted shortest-to-longest; fills with stroke color on find | ✓ Done |
| `components/HostBoardPreview.tsx` | 5s host-only board preview with large `LetterBoard` | ✓ Done |
| `components/RoundTimer.tsx` | Self-correcting countdown from server `endsAt`; turns red < 15s | ✓ Done |
| `components/FinishTracker.tsx` | Live finisher list with completion times (host only) | ✓ Done |
| `components/RoundRankings.tsx` | Per-round ranking table (finishers by time, non-finishers by words found) | ✓ Done |
| `components/Podium.tsx` | Final podium with medal emojis, sorted by `totalTimeMs` | ✓ Done |
| `components/TopicSelector.tsx` | Free-text `<input>` for topic entry (replaced dropdown) | ✓ Done |
| `components/LobbyList.tsx` | Player list in lobby | ✓ Done |
| `components/QrJoin.tsx` | QR code for join URL | ✓ Done |

## Ports

| Service | Port |
|---|---|
| Backend (NestJS) | **8888** |
| Frontend (Next.js) | **3333** |
