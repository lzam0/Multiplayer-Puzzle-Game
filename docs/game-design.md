# Game Design Spec

## Game Loop

```
1. Host opens the app → creates a room → gets a 4-letter code + QR code
2. Players scan QR / enter code on mobile → enter their name → land in lobby
3. Host can kick players from the lobby before the game starts
4. Host types any topic (e.g. "Ocean", "90s Movies") — Groq generates a word list
5. Host presses "Start Game"
6. Server generates a sparse letter grid from the word list
7. Host gets a 5-second preview of the board (players see nothing)
8. Board goes live on players' phones — each player's server-side timer starts
9. Players independently trace words by connecting adjacent letters on their screen
10. Server validates each submission; correct words highlight on that player's board only
11. Player finishes when all words are found (auto-submit) or the 90s round ends
12. Round rankings shown; host starts next round (up to 3 rounds)
13. Final podium: lowest total time across all rounds wins
```

## Multiplayer Rules

- Each player has their own independent board — finding a word does not remove it for others
- `word_correct` is sent only to the submitter — boards are private
- The host joins as a silent sentinel (`__host__`) and sees a reference board but does not compete
- Host can remove players from the lobby using the kick control (confirm dialog required)
- Kicked players are redirected home automatically
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

The server receives a Groq-generated word list and lays out letters on a **sparse** grid:

- All words are placed as orthogonally-adjacent (horizontal or vertical) paths
- No two words share a cell
- Non-word cells are left empty (`''`) and rendered as inert grey tiles on the board
- Grid is sized with ~1.5× padding over total word letters, giving an irregular silhouette
- The packer uses a **two-pass strategy**: strict pass first (ensures each word has exactly one valid traceable path); if that times out, a relaxed pass runs without the uniqueness constraint — all words are still placed in non-overlapping cells
- Words are placed longest-first to minimise backtracking
- Each word's canonical path (flat cell indices) is included in the board response

## Word Validation

**Multiplayer (server-side):**
1. Server reconstructs the word from the submitted `letterIndices` — the client-supplied word string is never trusted alone
2. Server checks the indices form a valid orthogonal, non-repeating path
3. Server checks the word is in the board's word list
4. Server checks the word has not already been found by this player
5. If all pass → `word_correct` to submitter only; otherwise → `word_incorrect`

**Solo (client-side):**
The board response includes `paths` — the canonical flat indices for each word. The frontend validates that the traced indices match the canonical path exactly, then records the word locally.

## Topics

Topics are generated dynamically by Groq (`llama-3.3-70b-versatile`) on demand. The host types any free-text topic; the backend prompts Groq for 10 uppercase, 3–8 letter English words. The validation pipeline:
- Filters to `/^[A-Z]{3,8}$/`
- Deduplicates
- Drops any word that is a strict prefix of another word in the list (e.g. `POKE` dropped when `POKEMON` is present — prefix pairs make board generation impossible)
- Requires at least 6 valid words after filtering, or returns an error
- Returns up to 6 words (shuffled)

The prompt instructs the model to include at least 3 words of 3–4 letters to ensure a mix of word lengths on every board.

See `docs/topics.md` for full details.

## Solo Mode

Solo mode lets a single player generate and solve boards without a room or host.

Flow:
1. **Topic entry** — player types any topic
2. **Word loading** — `POST /topics/words` generates 6 words via Groq
3. **Words preview** — words are displayed before the board is shown; player can go back and try a different topic
4. **Board loading** — `POST /board/generate` generates the board from the confirmed word list
5. **Playing** — client-side stopwatch runs; word validation is client-side using canonical `paths`
6. **Round result** — time, session best, and cumulative total are shown; player can start another round

## Lobby UX

- Host screen is designed for a big shared display (TV, laptop propped up, projector)
- QR code is displayed prominently so players can scan instantly (generated client-side)
- Room code shown in large type as a fallback
- Player names appear in the lobby list as they join
- Host can remove players via a per-player kick button (requires confirmation click)
- Host controls topic input and game start

## Backend Implementation Status

### What is implemented (Python backend)

**REST:**
- `POST /lobby` — create room
- `GET /lobby/{code}` — room lookup
- `POST /topics/words` — Groq word generation
- `POST /board/generate` — board generation from a word list
- `GET /` — health check

**Socket.io:**
- `join_room` — player and host join; host sentinel pattern
- `leave_room` — explicit leave
- `kick_player` — host removes a player
- `start_game` — begins round 1 (triggers Groq call + board generation + 5s preview)
- `next_round` — begins subsequent rounds
- Server → client: `room_joined`, `player_joined`, `player_left`, `player_kicked`, `round_starting`, `round_active`, `error`

### What is not yet implemented in the Python rewrite

- `trace_word` handler (and resulting `word_correct`, `word_incorrect`, `player_finished`)
- `end_round` (host early-end)
- `end_game` (trigger final podium → `round_over`, `game_over`)
- `reset_board` / `board_reset`
- Round timer expiry logic (stub exists in `_round_timer` coroutine)

The frontend (`useRoom.ts`) already wires up all of the above events and is ready once the backend handlers are added.

## What's Not Implemented (Game Features)

- **Diagonal word placement** — orthogonal only
