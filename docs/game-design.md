# Game Design Spec

## Game Loop

```
1. Host opens the app → creates a room → gets a 4-digit code + QR code
2. Players scan QR / enter code on mobile → enter their name → land in lobby
3. Host selects a topic from the list
4. Host presses "Start Game"
5. Server generates a letter grid from the topic's word list
6. All players see the same board simultaneously
7. Players trace words by connecting adjacent letters on their screen
8. Server validates each submission in real time
9. Correct words are highlighted on everyone's board; the finder gets a point
10. Game ends when all words are found → scoreboard shown
```

## Multiplayer Rules

- All players see the same board at the same time
- First player to correctly trace a word claims it (competitive)
- A word cannot be claimed twice
- Players can see who found each word as it happens
- No turn-taking — it's a race

## Scoring

| Action | Points |
|---|---|
| Find a word | +1 per word found |

Simple to start. Can extend to: bonus for longer words, time bonuses, streak bonuses.

## Board Generation

The server receives a topic, picks its word list, then lays out the letters on a grid such that:
- All words can be traced via adjacent (horizontal or vertical) letter connections
- Every cell in the grid is occupied by exactly one letter
- Every letter belongs to exactly one word
- Words do not overlap or share cells

This is the core algorithmic challenge of the project.

## Word Validation

When a player submits a trace:
1. Server checks the traced letter indices form a valid adjacent path
2. Server checks the resulting word is in the topic's word list
3. Server checks the word has not already been found
4. If all pass → broadcast `word_correct`; otherwise → send `word_incorrect` back to that player only

## Topics

Each topic is a named collection of words. The words are used to build the letter grid. Topics are stored as plain data (no database needed).

Example:
```json
{
  "id": "animals",
  "label": "Animals",
  "words": ["CAT", "DOG", "FOX", "OWL", "EEL", "GNU", "RAM"]
}
```

Words should:
- Be all caps
- Share no letters if possible (to make grid packing easier)
- Have a total letter count that fits the target grid size

See `docs/topics.md` for the full topic format and how to add new ones.

## Lobby UX

- Host screen is designed for a big shared display (TV, laptop propped up, projector)
- QR code is displayed prominently so players can scan instantly
- Room code is shown in large type as a fallback
- Player names appear in the lobby list as they join
- Host controls topic selection and game start

## Backend Status (Phase 1 — complete)

- **Topic data + resolution** — `topics.data.ts` ships 5 topics (Animals, Foods,
  Countries, Colors, Sports); `TopicsService.resolveTopic` matches by id or label.
- **Board generation** — `GameService.generateGrid` packs each word as an
  orthogonally-adjacent path, fills every cell, and is validated by tests.
- **Timed rounds** — host-side 5s preview, then board goes live on phones with a
  server-authoritative 90s timer; host can end a round early.
- **Per-player independent solve** — each player tracks their own found words;
  `word_correct` is sent only to the submitter.
- **Ranking** — per-round (finishers by time, non-finishers by words found) and a
  final podium by lowest total time across 3 rounds; non-finishers charged 120s.
- **Handlers** — `start_game`, `next_round`, `trace_word` (rate-limited),
  `end_round`, `end_game`; emits `round_starting`, `round_active`, `word_correct`,
  `word_incorrect`, `player_finished`, `round_over`, `game_over`.

See `docs/websocket-events.md` for the full contract.

## What's Not Yet Implemented

- **Frontend timed-round UX (Phase 2)** — host 5s preview + countdown + finish
  tracker, per-player board with local highlighting, round rankings, and the
  total-time podium. The current frontend still assumes the old shared-race model
  and must migrate from `game_started` to `round_starting` / `round_active`.
- **`leave_room` handler** — frontend emits it but the backend has no listener
  (disconnect handling does clean up players).

See `.claude/roadmap/02-frontend-experience.md` for the Phase 2 plan.
