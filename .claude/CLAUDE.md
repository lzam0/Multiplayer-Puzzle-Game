# WEND — Project Context for Claude

WEND is a real-time multiplayer word puzzle game. A host runs a room on a shared screen; players solve on their phones. Each round a letter grid is generated from a topic's word list and players race independently to trace all the words. Fastest total time across 3 rounds wins.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS + Socket.io, port **8888** |
| Frontend | Next.js 14 App Router + Tailwind CSS, port **3333** |
| State | In-memory only — no database |

## Project Structure

```
.
├── backend/src/
│   ├── lobby/          # Room creation, player management, round lifecycle
│   ├── game/           # Board generation, word validation, ranking
│   ├── topics/         # Topic data and resolution
│   └── gateway/        # WebSocket event handlers
├── frontend/src/
│   ├── app/host/[code] # Host view (big screen — QR, lobby, board, timer)
│   ├── app/play/[code] # Player view (mobile — board, word tracer)
│   ├── hooks/          # useRoom.ts, useSocket.ts
│   └── lib/types.ts    # Frontend type mirror of backend game.types.ts
└── docs/               # architecture.md, websocket-events.md, game-design.md, topics.md
```

## Game Model (Kahoot-style, per-player timed race)

- **3 rounds.** Host picks a topic and starts each round.
- **5s host preview.** Board shows on the host/PC screen only for 5s. Players see nothing.
- **Board goes live on phones.** After preview, `round_active` is emitted. Each player's timer starts server-side from this moment.
- **Independent solve.** Each player has their own found-words state. `word_correct` goes only to the submitter — never broadcast.
- **Auto-submit** when all words are found; server records completion time.
- **Round ranking:** finishers by time ascending, then non-finishers by words-found descending.
- **Non-finisher charged 120s** (90s round + 30s penalty) toward total.
- **Final podium = lowest total time** across all 3 rounds.
- Round timer is server-authoritative (90s). Host can end early.

## Socket Contract (frozen)

Full reference: `docs/websocket-events.md`

**Client → Server**
- `join_room` `{ code, playerName }`
- `start_game` `{ code, topic }` — host only; starts round 1
- `next_round` `{ code, topic }` — host only
- `trace_word` `{ code, word, letterIndices: number[] }` — rate-limited
- `end_round` `{ code }` — host early-end
- `end_game` `{ code }` — host triggers podium

**Server → Client**
- `round_starting` → host only (5s preview with board)
- `round_active` → all (board + `endsAt`; player clocks start)
- `word_correct` → submitter only
- `word_incorrect` → submitter only
- `player_finished` → host + that player
- `round_over` → all (`rankings`, `isLastRound`)
- `game_over` → all (`scores` + `podium`)

`letterIndices` are flat: `row = Math.floor(idx / cols)`, `col = idx % cols`.

## Host Sentinel Pattern

The host browser joins the Socket.io room as player name `__host__`. This lets the host receive game broadcasts (including `round_starting`) without appearing in the player list or competing. When `__host__` joins, the gateway calls `LobbyService.claimHost(code, socketId)` to bind the real socket ID — this is required for `start_game` guards to pass.

## Current Implementation State

**Backend (complete, 45/45 tests passing):**
- `topics.data.ts` — 5 topics (Animals, Foods, Countries, Colors, Sports)
- `TopicsService.resolveTopic` — matches by id or display label
- `GameService.generateGrid` — backtracking snake-fill, factor-pair grid sizing
- `GameService.validateTrace` — adjacency + membership + per-player dedup
- Gateway — full Kahoot-style round flow with server timers
- `LobbyService.claimHost` — fixes the hostId bug (was permanently `'pending'`)

**Frontend (pending — Phase 2):**
- Still uses old shared-race model: listens for `game_started` (removed), shared `foundWords`, `Player.score` as word count
- Must migrate to: `round_starting` → `round_active` → `round_over` → `game_over`
- `lib/types.ts` still has old `Player.score` instead of `totalTimeMs`/`roundsCounted`
- Phase 2 plan: `.claude/roadmap/02-frontend-experience.md`

## Key Design Decisions

- **Board grid sizing uses factor pairs**, not `ceil(sqrt)` — avoids invalid dimensions for certain letter counts.
- **`word_correct` is private** — never broadcast; each player's board is independent.
- **Completion time is server-computed** from `goLiveAt` to finish — never accept client-reported times.
- **Board withheld during preview** — players don't receive `round_starting`; they only get the board on `round_active`. This prevents pre-solving.
- **`start_game` guard:** `room.hostId !== client.id` rejects non-hosts. This only works after `claimHost` runs — without it, `hostId` stays `'pending'` forever.

## Running Locally

```bash
cd backend && npm run start:dev   # http://localhost:8888
cd frontend && npm run dev        # http://localhost:3333
```

## Roadmap

- `.claude/roadmap/00-overview.md` — vision and confirmed game model
- `.claude/roadmap/01-backend-engine.md` — Phase 1 spec (complete)
- `.claude/roadmap/02-frontend-experience.md` — Phase 2 spec (pending)
