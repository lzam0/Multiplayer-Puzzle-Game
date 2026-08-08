# WebSocket Event Reference

All real-time communication between clients and the server uses Socket.io (python-socketio on the backend).

Game model: Kahoot-style, multi-round, per-player timed race. The board previews on the HOST screen for 5s, then goes live on players' phones (their timer starts then). Players solve independently; the player with the LOWEST total time across all rounds wins.

## Client → Server

| Event | Payload | Backend status | Description |
|---|---|---|---|
| `join_room` | `{ code, playerName }` | ✓ Implemented | Join an existing room. Use `playerName: "__host__"` for the host sentinel. |
| `leave_room` | `{ code }` | ✓ Implemented | Explicitly leave a room (also fires on disconnect). |
| `kick_player` | `{ code, playerId }` | ✓ Implemented | Host removes a player from the room. |
| `start_game` | `{ code, topic }` | ✓ Implemented | Host starts round 1 with a free-text topic. Triggers Groq word generation and board construction. |
| `next_round` | `{ code, topic }` | ✓ Implemented | Host starts the next round after the previous one has ended. |
| `trace_word` | `{ code, word, letterIndices: number[] }` | ⏳ Not yet implemented | Player submits a traced word path for server-side validation. |
| `end_round` | `{ code }` | ⏳ Not yet implemented | Host ends the current round early. |
| `end_game` | `{ code }` | ⏳ Not yet implemented | Host triggers the final podium after the last round. |
| `reset_board` | `{ code }` | ⏳ Not yet implemented | Player clears their own found-words state (round must be active, player must not have finished). |

`letterIndices` are flat: `row = Math.floor(idx / cols)`, `col = idx % cols`.

## Server → Client

| Event | Payload | Audience | Backend status | Description |
|---|---|---|---|---|
| `room_joined` | `{ room: RoomState }` | joiner | ✓ Implemented | Confirms join; sends full room snapshot. |
| `player_joined` | `{ player: Player }` | others in room | ✓ Implemented | Broadcast when a new player joins. |
| `player_left` | `{ playerId }` | room | ✓ Implemented | Broadcast on disconnect or explicit `leave_room`. |
| `player_kicked` | `{ playerId, name }` | room | ✓ Implemented | Broadcast when host kicks a player. The kicked player's client detects `playerId === socket.id` and redirects home. |
| `round_starting` | `{ round, topic, board, previewMs, totalRounds }` | host only | ✓ Implemented | 5s board preview on the host screen; players receive nothing yet. |
| `round_active` | `{ round, topic, board, endsAt, durationMs }` | room | ✓ Implemented | Board goes live on phones; player clocks start from `endsAt - durationMs`. |
| `error` | `{ message }` | offending client | ✓ Implemented | Returned for invalid actions (room not found, not the host, etc.). |
| `word_correct` | `{ word, foundBy, score, remaining }` | submitter only | ⏳ Not yet implemented | A valid word trace was accepted. Private — never broadcast. |
| `word_incorrect` | `{ word, playerId }` | submitter only | ⏳ Not yet implemented | A trace was rejected. |
| `player_finished` | `{ playerId, name, completionTimeMs }` | host + that player | ⏳ Not yet implemented | A player found all words; server records completion time. |
| `round_over` | `{ rankings, roundIndex, isLastRound }` | room | ⏳ Not yet implemented | Round ranking after timer expires, host ends early, or all players finish. |
| `game_over` | `{ scores, podium }` | room | ⏳ Not yet implemented | Final results after host triggers end game. |
| `board_reset` | `{ code }` | caller only | ⏳ Not yet implemented | Ack sent after a successful `reset_board`. |

Notes:
- `word_correct` is sent ONLY to the submitting player — boards are independent, so a word found on one device is not highlighted on anyone else's.
- `round_starting` goes only to the host; players receive nothing until `round_active`, so the board cannot be pre-solved during the preview.
- Completion time is measured server-side from `goLiveAt` to finish — client-reported times are never accepted.
- Non-finishers are charged 120s (90s round + 30s penalty) toward their total.

## Room State Shape

```python
# Python dataclasses (backend/src/socket/game_state.py)
@dataclass
class Player:
    id: str           # socket ID
    name: str
    total_time_ms: float = 0.0
    rounds_counted: int = 0

@dataclass
class PlayerRoundState:
    found_words: set = field(default_factory=set)
    completed_at: Optional[float] = None  # epoch ms

@dataclass
class RoundState:
    index: int
    topic: str
    board: LetterGrid
    go_live_at: Optional[float] = None
    ends_at: Optional[float] = None
    player_states: dict = field(default_factory=dict)  # sid → PlayerRoundState
    timer_task: Optional[asyncio.Task] = None
    phase: str = "preview"  # preview | active | ended

@dataclass
class Room:
    code: str
    host_id: str = "pending"
    players: dict = field(default_factory=dict)  # sid → Player (non-host only)
    status: str = "waiting"    # waiting | in_progress | finished
    rounds: list = field(default_factory=list)   # list[RoundState]
```

```typescript
// TypeScript interfaces (frontend/src/lib/types.ts)
interface RoomState {
  code: string;
  hostId: string;
  players: Player[];
  status: 'waiting' | 'in_progress' | 'finished';
  currentRound: {
    index: number;
    topicId: string;
    board: LetterGrid;
    phase: 'preview' | 'active' | 'ended';
    goLiveAt: number | null;
    endsAt: number | null;
  } | null;
  roundNumber: number;
}

interface Player {
  id: string;          // socket ID
  name: string;
  totalTimeMs: number;
  roundsCounted: number;
}

interface LetterGrid {
  letters: string[][];                // 2D grid — non-word cells are ''
  words: string[];                    // target words
  rows: number;
  cols: number;
  paths: Record<string, number[]>;    // word → flat cell indices of canonical path
}

interface RoundRankEntry {
  playerId: string;
  name: string;
  completionTimeMs: number | null;
  wordsFound: number;
  rank: number;
  chargedMs: number;
}

interface PodiumEntry {
  playerId: string;
  name: string;
  totalTimeMs: number;
  rank: number;
}
```

## Host Sentinel

The host browser joins using `playerName: "__host__"`. This lets the host receive all game broadcasts (including `round_starting`, which players do not receive) without appearing in the player list or competing. `room.host_id` is set to the host's socket ID on join — required for `start_game` and `next_round` guards.

## Rate Limits

| Endpoint / Event | Limit |
|---|---|
| `POST /topics/words` | 100 requests / day per IP |
| `POST /board/generate` | 200 requests / day per IP |
| Global daily cap | 10,000 `POST /topics/words` requests across all IPs |

When the daily global cap is reached the server returns `503` with `"Daily generation limit reached. Service will resume tomorrow."`.
