# Game Design Spec

## Game Loop

```
1. Host opens the app → creates a room → gets a 4-digit code + QR code
2. Players scan QR / enter code on mobile → enter their name → land in lobby
3. Host types any topic (e.g. "Ocean", "90s Movies") — Groq generates a word list
4. Host presses "Start Game"
5. Server generates a sparse letter grid from the word list
6. Host gets a 5-second preview of the board (players see nothing)
7. Board goes live on players' phones — each player's server-side timer starts
8. Players independently trace words by connecting adjacent letters on their screen
9. Server validates each submission; correct words highlight on that player's board only
10. Player finishes when all words are found (auto-submit) or the 90s round ends
11. Round rankings shown; host starts next round (up to 3 rounds)
12. Final podium: lowest total time across all rounds wins
```

## Multiplayer Rules

- Each player has their own independent board — finding a word does not remove it for others
- `word_correct` is sent only to the submitter — boards are private
- The host joins as a silent sentinel (`__host__`) and sees a reference board but does not compete
- 3 rounds per game; host picks the topic for each round
- A 5-second host-only preview precedes each round — players cannot pre-solve

## Scoring

| Situation | Time charged |
|---|---|
| Player finishes all words | Server-computed elapsed time from round start |
| Player does not finish | 120s (90s round + 30s penalty) |

**Final podium = lowest total time** across all 3 rounds. Ties broken by round order.

Round rankings: finishers listed by time ascending, then non-finishers by words-found descending.

## Board Generation

The server receives the Groq-generated word list and lays out letters on a **sparse** grid:

- All words are placed as orthogonally-adjacent (horizontal or vertical) paths
- No two words share a cell
- Non-word cells are left empty (`''`) and rendered as inert grey tiles on the board
- Grid is sized with ~1.5× padding over total word letters, giving an irregular silhouette
- The packer uses a **two-pass strategy**: strict pass first (ensures each word has exactly one valid traceable path); if that times out on high-overlap word lists, a relaxed pass runs without the uniqueness constraint — all words are still placed in non-overlapping cells
- Words are placed longest-first to minimise backtracking

## Word Validation

When a player submits a trace:
1. Server checks the traced letter indices form a valid orthogonal, non-repeating path
2. Server reconstructs the word from the indices — the client-supplied word string is never trusted alone
3. Server checks the word is in the board's word list
4. Server checks the word has not already been found by this player
5. If all pass → `word_correct` to submitter only; otherwise → `word_incorrect` to submitter only

## Topics

Topics are generated dynamically by Groq (`llama-3.3-70b-versatile`) on demand. The host types any free-text topic; the backend prompts Groq for 6 uppercase, 3–8 letter English words strongly associated with that topic. The prompt requires at least 2 words to be 3 or 4 letters long to ensure a mix of word lengths.

Validation pipeline:
- Filter to `/^[A-Z]{3,8}$/`
- Deduplicate
- Require at least 4 valid words or return an error to the host
- Shuffle, return up to 6

See `docs/topics.md` for details on the word format.

## Lobby UX

- Host screen is designed for a big shared display (TV, laptop propped up, projector)
- QR code is displayed prominently so players can scan instantly
- Room code is shown in large type as a fallback
- Player names appear in the lobby list as they join
- Host controls topic input and game start

## Backend Status

- **43/43 tests passing** across 5 test suites
- Phases 1–6 complete and committed

### What's implemented
- `TopicsService.generateWords` — Groq-powered dynamic word generation for any topic
- `GameService.generateGrid` — sparse backtracking packer with two-pass strategy (strict uniqueness gate, then relaxed fallback)
- `GameService.validateTrace` — adjacency + membership + per-player dedup
- Full Kahoot-style round flow: `start_game` → 5s preview → `round_active` → `round_over` → `game_over`
- Server-authoritative 90s round timer; host can end early
- Per-player independent solve; completion time computed server-side
- `LobbyService.claimHost` — host sentinel pattern
- Rate-limited `trace_word` handler
- `GET /game/board?topic=` REST endpoint for solo mode board generation

See `docs/websocket-events.md` for the full socket contract.

### Frontend features
- SVG stroke overlay — found words rendered as colored paths over the board (Phase 5)
- `WordCounter` — letter-slot boxes sorted shortest-to-longest; fills with stroke color on find
- Solo mode (`/solo`) — single-player, client-side stopwatch, session best tracking, Groq-powered boards

## What's Not Yet Implemented

- **`leave_room` handler** — frontend emits it on disconnect but the backend has no listener; disconnect handling does clean up players automatically
- **Diagonal word placement** — orthogonal only
