# Phase 1 — Backend Engine (topics, board generation, timed rounds, total-time ranking)

**Branch:** `feature/backend-game-engine`
**Complexity:** L
**Depends on:** None
**Part of:** WEND Roadmap (`.claude/roadmap/00-overview.md`)

---

## Problem

The backend has three stubs (`TopicsService`, `GameService`, no `trace_word` handler) and its room model assumes a shared competitive race. The target game is a Kahoot-style, multi-round, per-player timed race: the board previews on the HOST screen for 5s, then goes live on players' phones where each player races independently; the final winner is the LOWEST total completion time across 3 rounds. This phase builds the data, the board generator, and the round/timer/ranking engine, and freezes the socket contract that the frontend (Phase 2) consumes.

## Goals

- Static topic data + `TopicsService` that resolves a topic by id-or-label and returns its words.
- `GameService.generateGrid(words)` → a `LetterGrid` where each word is an orthogonally-adjacent path, cells are unique, every cell filled; throws if it can't.
- Per-round, per-player state: each player independently tracks found words and a completion time.
- Server-authoritative round timer: 5s **host-screen** preview, then board goes live on phones and each player's clock starts; host-only countdown; host early-end.
- Auto-submit on full completion; server records completion time (from board-go-live-on-phone).
- Round ranking: finishers by completion time asc, then non-finishers by words-found desc.
- 3-round flow; each round's completion time accumulates into `Player.totalTimeMs`; final podium ranks by lowest total.
- Frozen socket contract documented for Phase 2.

## Non-Goals (this phase)

- Any UI (Phase 2).
- Database/persistence (topics + room state stay in memory).
- Diagonal tracing.
- Reconnection/resume of an in-progress round.

---

## Architecture

### New Files

| File path | Purpose |
|---|---|
| `backend/src/topics/topics.data.ts` | Exports `TOPICS: Topic[]` (Animals, Foods, Countries, Colors, Sports — labels matching `TopicSelector.tsx`). |
| `backend/src/topics/topics.data.spec.ts` | Asserts each topic meets packer constraints (all-caps, 3–8 letters, fillable total). |
| `backend/src/game/round.types.ts` (optional) | Round/PlayerRoundState/ranking types if `game.types.ts` grows too large; otherwise fold into `game.types.ts`. |

### Modified Files

| File path | What changes |
|---|---|
| `backend/src/game/game.types.ts` | Add `Topic`; add per-player round state and ranking types; rework `Room` (see Data Model). |
| `backend/src/topics/topics.service.ts` | Implement `getTopics`, `getTopicById`, `resolveTopic(idOrLabel)`, `getWords`. |
| `backend/src/topics/topics.module.ts` | `exports: [TopicsService]`. |
| `backend/src/topics/topics.service.spec.ts` | Real tests. |
| `backend/src/game/game.service.ts` | `generateGrid`, `indicesToWord`, `isAdjacentPath`, `validateTrace`, `rankRound`. |
| `backend/src/game/game.module.ts` | `exports: [GameService]`. |
| `backend/src/game/game.service.spec.ts` | Real tests. |
| `backend/src/lobby/lobby.service.ts` | Round lifecycle helpers (start/activate/end round, record found + completion, accumulate total time). |
| `backend/src/gateway/gateway.module.ts` | Import `GameModule`, `TopicsModule`. |
| `backend/src/gateway/game.gateway.ts` | Inject `GameService`+`TopicsService`; rewrite `start_game` → round start w/ host preview + timer; add `trace_word`, `end_round`, `next_round`, `end_game`. |
| `docs/websocket-events.md` | Rewrite for the new contract. |
| `docs/game-design.md` | Replace shared-race description with the timed per-player total-time model. |

---

### Data Model (in-memory; no DB)

```typescript
// game.types.ts
export interface Topic { id: string; label: string; words: string[]; }

export interface Player {
  id: string;              // socket id
  name: string;
  totalTimeMs: number;     // SUM of per-round completion times; LOWEST wins (replaces score)
  roundsCounted: number;   // how many rounds contributed to totalTimeMs
}

export interface LetterGrid { letters: string[][]; words: string[]; rows: number; cols: number; }

export interface PlayerRoundState {
  playerId: string;
  foundWords: string[];        // this player's own found words this round
  completedAt: number | null;  // ms from board-go-live-on-phone to finish; null if not finished
}

// 'preview' = board shown on HOST screen only, 5s; players see nothing yet
// 'active'  = board pushed to players' phones, their timers running
// 'ended'   = round closed (all finished / timer expired / host ended early)
export type RoundPhase = 'preview' | 'active' | 'ended';

export interface Round {
  index: number;               // 0-based round number
  topicId: string;
  board: LetterGrid;
  phase: RoundPhase;
  goLiveAt: number | null;     // epoch ms when board hits players' phones; each player's clock starts here
  endsAt: number | null;       // epoch ms deadline (goLiveAt + ROUND_DURATION_MS)
  playerStates: Map<string, PlayerRoundState>;
}

export type GameStatus = 'waiting' | 'in_progress' | 'finished';

export interface Room {
  code: string;
  hostId: string;
  players: Player[];
  status: GameStatus;
  currentRound: Round | null;  // replaces topic?/board?/foundWords
  roundNumber: number;         // rounds started so far (0..MAX_ROUNDS)
}

// Per-round ranking: finishers by time asc, then non-finishers by wordsFound desc
export interface RoundRankEntry {
  playerId: string; name: string;
  completionTimeMs: number | null; // null = did not finish
  wordsFound: number;
  rank: number;                     // 1-based within this round
  chargedMs: number;                // time added to totalTimeMs for this round
}

// Final podium: ranks by totalTimeMs ascending (lowest total wins)
export interface PodiumEntry { playerId: string; name: string; totalTimeMs: number; rank: number; }
```

**Removed/repurposed from old model:** `Room.topic`, `Room.board`, `Room.foundWords`, and `Player.score` (word count). Replaced by `Room.currentRound` and `Player.totalTimeMs`. The final winner is the LOWEST accumulated time. Deliberate breaking change; Phase 2 mirrors it.

### Constants

- `PREVIEW_MS = 5000` — board shown on the HOST screen for 5s before players receive it.
- `ROUND_DURATION_MS = 90000` — 90s per round (locked).
- `MAX_ROUNDS = 3` — fixed at 3 for now (host-configurable later).
- `NON_FINISH_PENALTY_MS = ROUND_DURATION_MS + 30000` — 120000ms (full 90s round + 30s penalty). Charged to a player who did NOT finish a round, so a non-finisher always contributes more toward `totalTimeMs` than any finisher of that round. LOCKED.
- `MAX_TRACE_PER_SEC = 10` (rate limit).

---

### Key Implementation Details

#### TopicsService — `topics.service.ts`
- `resolveTopic(idOrLabel)`: match `id`, else case-insensitive `label`. This is the recommended fix for the frontend sending labels ("Animals") — no frontend change required. `getWords(idOrLabel)` returns the resolved `words` or `undefined`.

#### GameService — `game.service.ts`
- `generateGrid(words): LetterGrid` — randomized greedy/backtracking snake-fill, `cols = ceil(sqrt(total))`, retry up to `MAX_ATTEMPTS`, throw `Error('Could not generate a board')` on failure. Returns `words` populated (self-describing).
- `indicesToWord(board, letterIndices)` — `row = floor(idx/cols)`, `col = idx%cols` (matches `WordTracer.tsx:64-66`; flat `number[]`).
- `isAdjacentPath(cols, letterIndices)` — consecutive indices differ by exactly one orthogonal step; reject diagonals/repeats.
- `validateTrace(board, playerFoundWords, word, letterIndices)` → `'correct' | 'incorrect'`: incorrect if not adjacent path, computed word ≠ `word.toUpperCase()`, word ∉ `board.words`, or already in **this player's** foundWords.
- `rankRound(round, players): RoundRankEntry[]` — split into finishers (`completedAt != null`) and non-finishers. Sort finishers by `completedAt` asc → they get `chargedMs = completedAt`. Sort non-finishers by `wordsFound` desc → they get `chargedMs = NON_FINISH_PENALTY_MS`. Assign contiguous `rank` (finishers first). This is the per-round view; the cumulative winner is decided later by `totalTimeMs`.

#### LobbyService — round lifecycle helpers
- `startRound(code, topicId, board)`: creates `Round` in `phase:'preview'`, initializes a `PlayerRoundState` per non-host player, sets `status:'in_progress'`, increments `roundNumber`. (Preview means the board exists but players have NOT received it yet.)
- `activateRound(code)`: sets `phase:'active'`, `goLiveAt = now`, `endsAt = now + ROUND_DURATION_MS`. This is the moment the board goes to phones and player clocks start.
- `recordFound(code, playerId, word)`: pushes to that player's `foundWords`; if all `board.words` found, set `completedAt = now - goLiveAt`. Returns `{ isComplete, wordsFound, total, completionTimeMs }`.
- `endRound(code, rankEntries)`: `phase:'ended'`; for each entry add `chargedMs` to that `Player.totalTimeMs` and increment `roundsCounted`; freeze states.
- `isLastRound(code)`: `roundNumber >= MAX_ROUNDS`.
- All timer bookkeeping stays server-side; gateway owns the `setTimeout`s (see below).

#### Gateway — `game.gateway.ts`

`constructor(lobby, game, topics)`.

**`start_game` (host starts round 1)** — data `{ code, topic }`:
1. `room = lobby.getRoom(code)`; if missing or `room.hostId !== client.id` → `client.emit('error', {message:'Only the host can start'})`; return.
2. Guard `room.roundNumber < MAX_ROUNDS` (else `error: 'All rounds played'`).
3. `words = topics.getWords(topic)`; if none → `client.emit('error', {message:'Unknown topic'})`; return (room unchanged).
4. `try board = game.generateGrid(words) catch → client.emit('error', {message:'Could not generate a board'})`; return.
5. `lobby.startRound(code, resolvedTopicId, board)`.
6. Emit `round_starting` **to the HOST only** with `{ round, topic: label, board, previewMs: PREVIEW_MS, totalRounds: MAX_ROUNDS }`. The host shows the board for 5s. Players receive NOTHING yet (they do not see the board during preview).
7. `setTimeout(PREVIEW_MS)`: `lobby.activateRound(code)`; emit `round_active` **to the whole room** with `{ round, topic, board, endsAt, durationMs }`. Players now receive the board and start tracing; their client-side timer is irrelevant (server authoritative). The host switches from preview to its live reference-board + countdown view.
8. `setTimeout(ROUND_DURATION_MS)` from go-live: if round still `active`, run the round-end sequence. Store the timer handle on the room so `end_round` can clear it.

**`trace_word`** — data `{ code, word, letterIndices }`:
1. Rate-limit per socket (`MAX_TRACE_PER_SEC`); drop excess.
2. `room` exists, `currentRound.phase === 'active'`, submitter ∈ players. Else return. (Traces during `preview` are ignored — players don't have the board yet anyway.)
3. `result = game.validateTrace(board, myState.foundWords, word, letterIndices)`.
4. `incorrect` → `client.emit('word_incorrect', { word, playerId: client.id })` (to submitter only).
5. `correct` → `lobby.recordFound(...)`; `client.emit('word_correct', { word: upper, foundBy: client.id, score: myState.foundWords.length, remaining })` **to submitter only** (NOT broadcast — independent boards). `foundBy`/`score` names kept for frontend compatibility; `score` = this player's words-found count.
6. If `isComplete` → auto-submit: emit `player_finished` to host + that player `{ playerId, name, completionTimeMs }`; if ALL non-host players have finished → run round-end sequence immediately.

**`end_round`** (host early-end) — data `{ code }`: host-guard; clear the round timer; run round-end sequence.

**Round-end sequence** (shared): `entries = game.rankRound(round, players)`; `lobby.endRound(code, entries)` (accumulates `totalTimeMs`); emit `round_over` to room `{ rankings: RoundRankEntry[], roundIndex, isLastRound }`. Room stays `in_progress` awaiting the host.

**`next_round`** (host) — data `{ code, topic }`: same path as `start_game` steps 1–8 for the next round. Guard against exceeding `MAX_ROUNDS`.

**`end_game`** (host, or auto-offer after the last round) — data `{ code }`: host-guard; `lobby.setStatus('finished')`; build podium from `players` sorted by `totalTimeMs` **ascending** (lowest wins); emit `game_over` to room `{ scores }` where `scores: Score[]` keep the `{ id, name, score }` shape but `score = totalTimeMs` (⚠️ Phase 2 must render this as a time, ascending — see note). Also emit `podium` `{ entries: PodiumEntry[] }` (sorted ascending) so Phase 2 can render a proper 3/2/1 by lowest time.

> **Scoreboard semantics note:** the legacy `Score.score` field is numerically overloaded here to carry `totalTimeMs`, and lower is better (opposite of the old word-count). Phase 2 must sort ascending and format as time. The dedicated `podium` event is the clean path; `game_over.scores` is kept only for backward compatibility of the existing handler.

---

### Socket Contract (frozen for Phase 2)

**Client → Server**

| Event | Payload |
|---|---|
| `start_game` | `{ code, topic }` (topic = label or id; server resolves) |
| `trace_word` | `{ code, word, letterIndices: number[] }` |
| `end_round` | `{ code }` (host) |
| `next_round` | `{ code, topic }` (host) |
| `end_game` | `{ code }` (host) |

**Server → Client**

| Event | Payload | Audience |
|---|---|---|
| `round_starting` | `{ round, topic, board: LetterGrid, previewMs, totalRounds }` | **host only** (5s preview) |
| `round_active` | `{ round, topic, board: LetterGrid, endsAt, durationMs }` | room (players get board here; host shows timer) |
| `word_correct` | `{ word, foundBy, score, remaining }` | submitter only |
| `word_incorrect` | `{ word, playerId }` | submitter only |
| `player_finished` | `{ playerId, name, completionTimeMs }` | host + that player |
| `round_over` | `{ rankings: RoundRankEntry[], roundIndex, isLastRound }` | room |
| `game_over` | `{ scores: Score[] }` (score = totalTimeMs, asc) + `podium: PodiumEntry[]` | room |
| `error` | `{ message }` | offending client |

`game_started` (old) is replaced by `round_starting` (host preview) + `round_active` (players get board). Phase 2 must migrate.

---

## Security

### Trust Boundary
Every socket field is validated server-side:
- `code` → must resolve to a room; `topic` → must resolve via `resolveTopic`, never used in any query/template.
- `letterIndices` → each in `[0, rows*cols)`; must form an adjacent, non-repeating path; bounds-check before indexing `board.letters`.
- `word` → must equal the server-computed word from indices AND be in `board.words`; client word string never trusted alone.
- **Completion time is computed server-side** from `goLiveAt`; never accept a client-reported time (prevents cheating the race).
- Board is **not sent to players during `preview`** — a player cannot pre-solve; they only receive it on `round_active`.

### Auth Guards

| Operation | Guard |
|---|---|
| `start_game` / `next_round` / `end_round` / `end_game` | `room.hostId === client.id`, else `error`. |
| `trace_word` | submitter ∈ `room.players`, round `phase === 'active'`. |
| Ranking / totals | server-built only; never client-supplied. |

### Rate Limiting
`trace_word`: `MAX_TRACE_PER_SEC` (~10/s/socket), in-memory timestamp map, drop excess.

### Injection Surfaces
None. No SQL/shell/HTML templating; topic data developer-authored; player strings only compared/echoed (React escapes on render).

### Secrets
None introduced. Do not log full board layouts at info level (they reveal answers).

---

## Verification Steps

### Happy Path
1. Two players + host in lobby. Host picks topic, `start_game`.
2. Expected: HOST receives `round_starting` and shows the board for 5s; players see nothing yet.
3. After 5s: all receive `round_active` — players get the board and can trace; host shows reference board + 90s countdown.
4. Player A finishes all words at ~21s, Player B at ~35s (server-measured from go-live).
5. Expected: each gets `word_correct` (own board only); on completion each triggers `player_finished` to host; A shows 21s, B 35s.
6. When both finish (or host `end_round` or 90s expiry): `round_over` — A rank 1 (charged 21s), B rank 2 (charged 35s); totals updated.
7. Repeat for rounds 2 and 3. After round 3 (`isLastRound` true), host `end_game` → `game_over` + `podium` ranked by lowest `totalTimeMs`.

### Edge Cases
- [ ] `trace_word` during `preview` → ignored (player has no board anyway).
- [ ] Already-found word (same player) → `word_incorrect`.
- [ ] Diagonal / non-contiguous / out-of-range indices → `word_incorrect`, no crash.
- [ ] Unknown topic → `error` to host, room unchanged.
- [ ] `generateGrid` failure → `error` to host, room unchanged.
- [ ] Host `end_round` before anyone finishes → all non-finishers, each charged `NON_FINISH_PENALTY_MS`, ranked by words-found.
- [ ] Timer expiry with partial finishers → finishers charged their time, non-finishers charged penalty.
- [ ] Attempt to start a 4th round → `error: 'All rounds played'`.
- [ ] Player disconnect mid-round → removed from `playerStates`; round can still complete.
- [ ] Non-finisher's total never beats a full finisher purely by the penalty math (verify with a 2-round scenario).

### Security Verification
- [ ] Non-host emits `start_game`/`end_round`/`next_round`/`end_game` → rejected.
- [ ] Non-member emits `trace_word` → ignored.
- [ ] Client cannot influence its `completionTimeMs` (server-computed).
- [ ] Player never receives the board during `preview`.
- [ ] `word_correct` reaches only the submitter (others' boards stay clean).
- [ ] Flood `trace_word` → excess dropped.

---

## Open Questions
None blocking. All model decisions are locked (see `.claude/roadmap/00-overview.md` "Resolved Questions"). Non-finisher penalty confirmed at 120s (90s + 30s).
