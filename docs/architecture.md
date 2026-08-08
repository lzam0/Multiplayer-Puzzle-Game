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
│                  FASTAPI BACKEND (Python)                    │
│                   localhost:8888                             │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  REST API   │  │  Socket.io   │  │   Game Engine    │  │
│  │  /lobby     │  │  (python-    │  │  (in-memory      │  │
│  │  /topics    │  │   socketio)  │  │   state)         │  │
│  │  /board     │  │              │  │                  │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  controllers/topics.py — Groq API (llama-3.3-70b)   │  │
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
All game state is held in-memory on the Python server using a plain `dict[str, Room]`. When the server restarts, all rooms are cleared. This is intentional — games are short-lived local sessions.

### In-Memory Room State
Each room holds:
- Room code (4-letter string, e.g. `"WXYZ"`)
- Host socket ID (bound via the `__host__` sentinel when the host's browser joins)
- Dict of connected players (`id`, `name`, `totalTimeMs`, `roundsCounted`) — host excluded
- List of `RoundState` objects with phase, board, `goLiveAt`, `endsAt`, per-player state
- `LetterGrid` — sparse: `letters: list[list[str]]` where non-word cells are `''`; includes `paths: dict[str, list[int]]` for canonical word traces

### Two Frontend Views
- **Host view** (`/host/[code]`) — designed for a large shared screen. Shows QR code, lobby with kick controls, 5s board preview, large reference board during active rounds, finish tracker, round rankings, final podium.
- **Player view** (`/play/[code]`) — designed for mobile. Shows the sparse letter grid, word tracer, `WordCounter` progress panel, round rankings, final podium. Players can be kicked by the host.

### Host Sentinel Pattern
The host browser joins the Socket.io room using the player name `__host__`. This lets the host receive game broadcasts (including `round_starting`, which players do not receive) without appearing in the player list or competing. When `__host__` joins, the gateway sets `room.host_id = sid` — required for `start_game` / `next_round` guards to pass.

### WebSocket-First
All real-time game events go through Socket.io. The REST API handles room creation and board/word generation for solo mode.

### Dynamic Topic Generation
Topics are generated on demand by the Groq API (`llama-3.3-70b-versatile`). The host types any free-text topic; the backend fetches 10 candidate words, validates and filters them (minimum 6 valid words required after prefix-pair removal), then uses 6 words to generate the board.

### QR Code
Generated client-side by the frontend using `qrcode.react`. The backend has no QR endpoint.

### Solo Mode
Solo players call two REST endpoints in sequence:
1. `POST /topics/words { topic }` — generates and previews the word list
2. `POST /board/generate { words }` — generates the board from the confirmed words

Word validation in solo mode is client-side: the board response includes `paths` (canonical flat indices for each word) and the frontend checks that the trace matches the canonical path exactly.

## Module Breakdown

### Backend (`backend/`)

| File | Purpose |
|---|---|
| `main.py` | FastAPI app, CORS, rate limiter, Socket.io server, router registration, middleware wiring, uvicorn entrypoint |
| `src/routes/health.py` | `GET /` — health check |
| `src/routes/lobby.py` | `POST /lobby`, `GET /lobby/{code}` — room creation and lookup |
| `src/routes/topics.py` | `POST /topics/words` — Groq word generation (100/day per-IP) |
| `src/routes/board.py` | `POST /board/generate` — board generation from a word list (200/day per-IP) |
| `src/controllers/topics.py` | `generate_words(topic)` — Groq API call + validation pipeline |
| `src/controllers/board.py` | `generate_grid(words)` — backtracking packer, two-pass strict/relaxed |
| `src/controllers/health.py` | `get_health()` — returns service name and port |
| `src/socket/game_state.py` | Dataclasses: `Room`, `Player`, `RoundState`, `PlayerRoundState`; constants; `make_code()`; in-memory `rooms` and `sid_to_code` dicts |
| `src/socket/events.py` | Socket.io event handlers: `join_room`, `leave_room`, `kick_player`, `start_game`, `next_round`; `_start_round` coroutine |
| `src/middleware/daily_cap.py` | Global daily cap — rejects `POST /topics/words` after 10,000 requests per calendar day |

### Frontend (`frontend/src/`)

| File | Purpose |
|---|---|
| `app/host/[code]/HostView.tsx` | Host phase machine: lobby → preview → active → round-result → game-over |
| `app/play/[code]/PlayerView.tsx` | Player phase machine: name-entry → lobby → active → round-result → game-over; kicked screen |
| `app/solo/SoloView.tsx` | Solo phase machine: topic-entry → loading → words-preview → loading → playing → round-result |
| `app/solo/page.tsx` | Route wrapper for `/solo` |
| `app/api/lobby/route.ts` | Next.js proxy: `POST /api/lobby` → `POST /lobby` on backend |
| `app/api/lobby/[code]/route.ts` | Next.js proxy: `GET /api/lobby/[code]` → `GET /lobby/{code}` on backend |
| `hooks/useRoom.ts` | Socket event wiring, all game state, `pendingTraceRef` pattern for SVG stroke overlay, `kicked` state |
| `hooks/useSocket.ts` | Thin wrapper over `SocketProvider` context |
| `hooks/useStopwatch.ts` | Client-side stopwatch (start/stop/reset, 100ms tick) — used by solo mode |
| `lib/types.ts` | Frontend type definitions: `Player`, `LetterGrid` (with `paths`), `RoomState`, event payload interfaces |
| `lib/format.ts` | `formatMs(ms)` — shared time formatter |
| `lib/config.ts` | `BACKEND_URL` / `WS_URL` from `NEXT_PUBLIC_BACKEND_URL` or fallback to `localhost:8888` |
| `lib/socket.ts` | Singleton Socket.io client factory (`getSocket()`) |
| `lib/errorReporter.ts` | Client-side error reporter |
| `context/SocketProvider.tsx` | Socket.io context provider; initialises error reporter |
| `components/LetterBoard.tsx` | Sparse grid renderer; grey inert tiles for `''` cells; `cellSize` prop |
| `components/WordTracer.tsx` | Touch/mouse drag trace; SVG stroke overlay for found words; `locked` prop; reset button bottom-right |
| `components/WordCounter.tsx` | Compact horizontal-wrap layout; letter-slot boxes sorted shortest-to-longest; fills with stroke color on find |
| `components/HostBoardPreview.tsx` | 5s host-only board preview with large `LetterBoard` |
| `components/RoundTimer.tsx` | Self-correcting countdown from server `endsAt`; turns red < 15s |
| `components/FinishTracker.tsx` | Live finisher list with completion times (host only) |
| `components/RoundRankings.tsx` | Per-round ranking table (finishers by time, non-finishers by words found) |
| `components/Podium.tsx` | Final podium with medal emojis, sorted by `totalTimeMs` |
| `components/TopicSelector.tsx` | Free-text `<input>` for topic entry |
| `components/LobbyList.tsx` | Player list in lobby |
| `components/QrJoin.tsx` | QR code via `qrcode.react` — client-side, no backend call |
| `components/BackButton.tsx` | Fixed top-left "← Home" button; `variant` prop for light/dark backgrounds |
| `components/Feedback.tsx` | Toast overlay for `word_correct` / `word_incorrect` feedback |
| `components/HowToPlay.tsx` | How-to-play modal shown from host lobby |
| `components/Scoreboard.tsx` | Legacy — superseded by `Podium.tsx` |
| `components/FoundWords.tsx` | Legacy — superseded by `WordCounter.tsx` |

## Ports

| Service | Port |
|---|---|
| Backend (FastAPI) | **8888** |
| Frontend (Next.js) | **3333** |

## Running Locally

```bash
# Backend (requires uv)
cd backend && uv run python main.py

# Frontend
cd frontend && npm run dev        # localhost only
cd frontend && npm run dev:lan    # LAN mode — lets real phones join over Wi-Fi
```
