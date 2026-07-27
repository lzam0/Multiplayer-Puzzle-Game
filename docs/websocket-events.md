# WebSocket Event Reference

All real-time communication between clients and the server uses Socket.io events.

Game model: Kahoot-style, multi-round, per-player timed race. The board previews
on the HOST screen for 5s, then goes live on players' phones (their timer starts
then). Players solve independently; the finisher with the LOWEST total time across
all rounds wins.

## Client → Server

| Event | Payload | Status | Description |
|---|---|---|---|
| `join_room` | `{ code: string, playerName: string }` | Implemented | Player joins an existing room |
| `start_game` | `{ code: string, topic: string }` | Implemented | Host starts round 1 (topic = id or label; server resolves) |
| `next_round` | `{ code: string, topic: string }` | Implemented | Host starts the next round |
| `trace_word` | `{ code: string, word: string, letterIndices: number[] }` | Implemented | Player submits a traced word (rate-limited) |
| `end_round` | `{ code: string }` | Implemented | Host ends the current round early |
| `end_game` | `{ code: string }` | Implemented | Host ends the game and triggers the podium |
| `reset_board` | `{ code: string }` | Implemented | Player clears their found-words state (multiplayer only; round must be active and player must not have finished) |

`letterIndices` are flat: `row = Math.floor(idx / cols)`, `col = idx % cols`.

## Server → Client

| Event | Payload | Audience | Description |
|---|---|---|---|
| `room_joined` | `{ room: RoomState }` | joiner | Confirms join; sends full room state |
| `player_joined` | `{ player: Player }` | others | Broadcasts when a new player joins |
| `player_left` | `{ playerId: string }` | room | Broadcasts when a player disconnects |
| `round_starting` | `{ round, topic, board, previewMs, totalRounds }` | host only | 5s board preview on the host screen |
| `round_active` | `{ round, topic, board, endsAt, durationMs }` | room | Board goes live on phones; player clocks start |
| `word_correct` | `{ word, foundBy, score, remaining }` | submitter only | A word the player found (private) |
| `word_incorrect` | `{ word, playerId }` | submitter only | Rejected submission |
| `player_finished` | `{ playerId, name, completionTimeMs }` | host + that player | A player completed their board |
| `round_over` | `{ rankings, roundIndex, isLastRound }` | room | Round ranking (finishers by time, then non-finishers by words) |
| `game_over` | `{ scores, podium }` | room | Final results |
| `board_reset` | `{ code: string }` | caller only | Ack sent to the player whose found-words were cleared by `reset_board` |
| `error` | `{ message }` | offending client | Invalid action |

Notes:
- `word_correct` is sent ONLY to the submitting player — boards are independent,
  so a word found on one device is not highlighted on anyone else's.
- `round_starting` goes only to the host; players receive nothing until
  `round_active`, so the board cannot be pre-solved during the preview.
- Completion time is measured server-side from `round_active` go-live to finish.
- Non-finishers are charged 120s (90s round + 30s penalty) toward their total.

## Room State Shape

```typescript
interface RoomState {
  code: string;
  hostId: string;      // socket ID of the host
  players: Player[];
  status: 'waiting' | 'in_progress' | 'finished';
  currentRound: Round | null;
  roundNumber: number; // rounds started so far (0..3)
}

interface Player {
  id: string;          // socket ID
  name: string;
  totalTimeMs: number; // SUM of per-round times; LOWEST wins
  roundsCounted: number;
}

interface LetterGrid {
  letters: string[][]; // 2D grid of letters
  words: string[];     // target words (self-describing board)
  rows: number;
  cols: number;
}

interface Round {
  index: number;
  topicId: string;
  board: LetterGrid;
  phase: 'preview' | 'active' | 'ended';
  goLiveAt: number | null;
  endsAt: number | null;
  playerStates: Map<string, PlayerRoundState>;
}

interface PlayerRoundState {
  playerId: string;
  foundWords: string[];       // this player's own found words this round
  completedAt: number | null; // ms from go-live to finish; null if not finished
}

interface RoundRankEntry {
  playerId: string; name: string;
  completionTimeMs: number | null;
  wordsFound: number;
  rank: number;
  chargedMs: number;
}

interface PodiumEntry { playerId: string; name: string; totalTimeMs: number; rank: number; }

// Legacy shape kept for the game_over handler. NOTE: `score` carries totalTimeMs
// (lower is better) — prefer the `podium` array, which is ordered ascending.
interface Score { id: string; name: string; score: number; }
```

## Host Sentinel

The host browser joins the Socket.io room using the player name `__host__` so it
receives all game broadcasts without appearing in the player list or competing.
The frontend filters this sentinel out of the lobby display, and the backend
excludes it from round state, ranking, and the podium.
