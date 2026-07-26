# WEND Roadmap — Kahoot-Style Timed Word Race

**Owner:** planning
**Status:** FROZEN — ready for implementation
**Supersedes:** `docs/plan-board-generation.md` (old shared-race model, now obsolete)

---

## Vision

WEND is a multi-round, Kahoot-style word-search race. The host runs the room on a shared PC display; players solve on their phones. Each round: the host picks a topic and starts; the board is revealed **on the host screen for 5 seconds**, then it appears on the players' phones and each player's timer starts. Players race **independently** to find all the words on their own device. The server times each player from board-go-live (on their phone) to auto-submit. Fastest full completion wins the round. After each round a ranking is shown; after 3 rounds, a final podium ranks players by their **total time across all rounds** (lowest wins).

## Confirmed Game Model (all clarifications resolved)

- **3 rounds per game.** Fixed at 3 for now (host-configurable later). Host picks a topic at the start of each round; host advances between rounds.
- **5-second preview on the HOST screen.** On round start, the board is shown for 5s on the host/PC display only. Players do NOT see it yet.
- **Player timer starts when the board appears on their phone** (after the host's 5s preview). Completion time = from board-go-live-on-phone to auto-submit.
- **Independent per-player solve.** Each player has their own found-words state. A word found by one player is NOT highlighted on anyone else's board.
- **Auto-submit.** Finding all words auto-submits; server records that player's completion time for the round.
- **Round ranking:** finishers by completion time ascending; non-finishers below, ordered by words-found descending.
- **Server-authoritative timer, host-only display, 90s per round.** Only the host screen shows the countdown. Host can end the round early.
- **Non-finisher time charge:** a player who does not finish a round is charged **120s (90s round + 30s penalty)** toward their total, so they always rank below any finisher of that round.
- **Final ranking = total time to complete all puzzles across the 3 rounds, lowest total wins.** (No points-per-round system.)
- **Joins allowed only in lobby / between rounds**, never mid-round.
- **PC = 5s preview, then clean reference board + timer + live finish status.** Player phones = interactive board.

## Resolved Questions (all locked — none blocking)

- Time zero = board-go-live on player's phone (after host's 5s preview). ✔
- Round duration = 90s. ✔
- Round ranking = finishers by time, then non-finishers by words-found. ✔
- Non-finisher charged 120s (90s + 30s penalty) per unfinished round. ✔
- Final podium = total completion time across rounds, lowest total wins. ✔
- 3 rounds, host picks topic per round. ✔
- Joins only in lobby / between rounds. ✔
- Time display = seconds with 2 decimals (e.g. `21.34s`). ✔
- Topic resolution = backend `resolveTopic` matches label or id (no frontend change). ✔

## Phases

| Phase | File | Depends on | Complexity |
|---|---|---|---|
| 1 — Backend: topics, board generation, timed per-player rounds, total-time ranking | `.claude/roadmap/01-backend-engine.md` | None | L |
| 2 — Frontend: host preview + timer, per-player board, rankings, total-time podium | `.claude/roadmap/02-frontend-experience.md` | Phase 1 socket contract | L |

Phases share one **socket contract** (defined in Phase 1, "Socket Contract"). Implement Phase 1 first; Phase 2 can begin once the contract is frozen.

## Model Change Notice

The current codebase (both ends) implements a **shared competitive race**: one global `Room.foundWords`, first-to-claim-wins, `word_correct` broadcast to all, score = word count. This roadmap replaces that with **independent timed solving ranked by total time**. Expect to remove/repurpose `Room.foundWords`, stop broadcasting `word_correct`, and replace word-count scoring with accumulated completion time. Both phase plans call out every such change explicitly.
