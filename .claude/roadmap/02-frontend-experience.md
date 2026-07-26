# Phase 2 — Frontend Experience (host preview + timer, per-player board, total-time podium)

**Branch:** `feature/frontend-timed-rounds`
**Complexity:** L
**Depends on:** Phase 1 socket contract (frozen in `.claude/roadmap/01-backend-engine.md`)
**Part of:** WEND Roadmap (`.claude/roadmap/00-overview.md`)

---

## Problem

The current frontend is built for a shared race: it reads `game_started` (no board), applies `word_correct` to a global `foundWords`, and shows a single `Scoreboard`. The target UX is Kahoot-style: the board previews on the **host screen for 5s**, then appears on each player's phone where they solve **independently** while a **host-only** server-driven countdown runs; per-round rankings show between rounds; after 3 rounds a final podium ranks players by **lowest total time**. This phase reworks the state hook, host view, player view, and adds preview/timer/ranking/podium components — consuming the Phase 1 contract.

## Goals

- Host: 5s board preview (`round_starting`), then a clean reference board + live server-driven countdown (host-only) + live finish tracker; End Round Early; topic pick for next round; End Game; final podium.
- Player: no preview and no board during host preview; board appears on `round_active`; solve independently with own found-words highlighting locally; auto-submit is server-side (no submit button); per-round result + final podium.
- Correct migration from `game_started` to `round_starting` (host preview) + `round_active` (players get board).
- Podium ranks by **lowest total time** (ascending) — opposite of the old highest-score scoreboard.

## Non-Goals (this phase)
- Backend logic (Phase 1). Diagonal tracing. Reconnection UX. Animations beyond basic transitions.

---

## Architecture

### New Files

| File path | Purpose |
|---|---|
| `frontend/src/components/HostBoardPreview.tsx` | Host-only 5s board reveal shown on `round_starting`, before players get the board. |
| `frontend/src/components/RoundTimer.tsx` | Host-only countdown driven by server `endsAt` (`round_active`); remaining = `endsAt - Date.now()` on an interval. Display-only, no local authority. |
| `frontend/src/components/FinishTracker.tsx` | Host-only live list of players who finished, with formatted `completionTimeMs`. |
| `frontend/src/components/RoundRankings.tsx` | Between-round ranking table (`RoundRankEntry[]`): finishers by time, non-finishers below. |
| `frontend/src/components/Podium.tsx` | Final 3rd/2nd/1st podium ranked by **lowest `totalTimeMs`** (`PodiumEntry[]`). |

### Modified Files

| File path | What changes |
|---|---|
| `frontend/src/lib/types.ts` | Mirror Phase 1 types: `Topic`, `PlayerRoundState`, `Round`, `RoundRankEntry`, `PodiumEntry`; rework `RoomState` (drop `topic?`/`board?`/`foundWords`; add `currentRound`); `Player.totalTimeMs` replaces `score`; new payloads: `RoundStartingPayload{ round, topic, board, previewMs, totalRounds }`, `RoundActivePayload{ round, topic, board, endsAt, durationMs }`, `PlayerFinishedPayload`, `RoundOverPayload{ rankings, roundIndex, isLastRound }`, `GameOverPayload{ scores, podium }`. |
| `frontend/src/hooks/useRoom.ts` | Replace `onGameStarted` with `onRoundStarting` (host: stash board + enter preview) and `onRoundActive` (all: receive board, players start solving); keep own `foundWords` **locally**, applied only from this client's `word_correct`; add `onPlayerFinished`, `onRoundOver`, `onGameOver(podium)`; add `endRound`, `nextRound`, `endGame` emitters; keep `traceWord`. Expose `isHost`, `previewBoard`, `endsAt`, `roundRankings`, `podium`, `finishers`. |
| `frontend/src/app/host/[code]/HostView.tsx` | Preview phase: `HostBoardPreview` (5s). In-progress: clean reference board + `RoundTimer` + `FinishTracker` + End Round Early. Between rounds: `RoundRankings` + `TopicSelector` + Start Next Round (hidden once 3 rounds played) + End Game. Finished: `Podium`. |
| `frontend/src/app/play/[code]/PlayerView.tsx` | No board during host preview (show "Get ready…" + topic only). Board appears on `round_active`; interactive board uses locally-tracked found words; on completion show "Done — waiting for others"; add round-result + podium screens. Player NEVER sees the timer or the preview. |
| `frontend/src/components/WordTracer.tsx` | Accept `foundWords`/`locked` props so found words stay highlighted and tracing disables after the player completes. (Index math unchanged — already matches backend.) |
| `frontend/src/components/TopicSelector.tsx` | No change required (backend resolves labels). |
| `frontend/src/components/Scoreboard.tsx` | Either repurpose for ascending-time display or leave to new `Podium.tsx`. If reused with `game_over.scores`, it MUST sort ascending and format `score` as time — see contract note. Prefer `Podium.tsx` + the `podium` event to avoid the overloaded field. |
| `frontend/src/lib/format.ts` (new, small) | `formatMs(ms) → "21.34s"` shared time formatter (seconds with 2 decimals). Used by RoundTimer, FinishTracker, RoundRankings, Podium. |

---

### Key UI Behaviours

**Host phase machine:**
`lobby → preview (5s HostBoardPreview) → in-progress (reference board + RoundTimer + FinishTracker + End Round Early) → round-result (RoundRankings + next-topic + Start Next Round / End Game) → [loop up to 3 rounds] → finished (Podium)`.
- `preview` on `round_starting`; auto-advance to in-progress on `round_active`.
- `RoundTimer` counts down from `endsAt`, recomputed from `Date.now()` so it self-corrects; at 0 the host waits for `round_over`.
- `FinishTracker` appends each `player_finished` with formatted time.
- **Start Next Round** hidden once `roundIndex + 1 >= totalRounds`; only **End Game** remains.

**Player phase machine** (extends `PlayerView.tsx:29`):
`name-entry → lobby → get-ready (host preview: topic + "Get ready", NO board) → game (interactive, board from round_active) → round-result → [loop] → game-over (Podium)`.
- During host preview the player has NO board (server withholds it) — show a "Get ready" screen.
- `game`: board interactive; local `foundWords` grows only from this client's `word_correct`; on completion show "Done — waiting for others" (auto-submit is server-side; no button).
- Timer and preview are NEVER rendered on the player device.

**Podium:** on `game_over`, host and players render `Podium` from `podium` (top 3 by lowest `totalTimeMs`), rest listed below with their totals as time.

**Time display:** all times (round completion, live countdown, finish tracker, rankings, podium totals) formatted as seconds with 2 decimals, e.g. `21.34s`. Single shared `formatMs` helper.

---

### Contract note (must-read for implementer)

`game_over.scores[].score` carries `totalTimeMs`, and **lower is better** (opposite of the old word-count scoreboard). Do NOT reuse the existing descending `Scoreboard` sort as-is. Prefer the dedicated `podium: PodiumEntry[]` event, which is already ordered ascending by time.

---

## Security (frontend surface)
- Timer and completion times are **display-only**; the client never reports time to the server. Do not add any client-sent timing field.
- Player device must not receive/render the board during host preview (server withholds it; UI must not fabricate one).
- Player names rendered via React (auto-escaped); keep the `maxLength` on the name input (already present).
- Host-only controls (`end_round`, `next_round`, `end_game`) are UI-gated for convenience; authority is server-side (Phase 1 host-guards).
- No secrets in client code; socket URL from existing env config.

---

## Verification Steps

### Happy Path
1. Two phones join; host starts round 1.
2. Expected: HOST shows the board for 5s; both phones show "Get ready" with NO board.
3. After 5s: phones receive the board and can trace; host shows reference board + 90s countdown.
4. Phone A solves at ~21s → its board fully highlighted + "Done, waiting"; host FinishTracker shows A `21.xxs`.
5. Phone B solves at ~35s → host shows B `35.xxs`.
6. Round ends (both finished / host early-end / timer) → all show RoundRankings: A rank 1, B rank 2.
7. Host runs rounds 2 and 3; after round 3, Start Next Round is hidden → host ends game → Podium ranks by lowest total time.

### Edge Cases
- [ ] A word found on one phone highlights only there — not the other phone, not the host board.
- [ ] Invalid trace → Feedback "incorrect"; no highlight.
- [ ] Host early-end before B finishes → B shown as non-finisher, ranked by words-found.
- [ ] Timer display stays accurate after a brief tab blur (recomputed from `endsAt`).
- [ ] Player device renders no timer and no board during host preview.
- [ ] After 3 rounds, only End Game is offered on the host.
- [ ] Podium orders ascending by total time (fastest total on top).
- [ ] All displayed times use the 2-decimal seconds format.

### Security Verification
- [ ] Non-host device renders no host controls; a forged `end_game`/`next_round` is rejected by backend (Phase 1 test).
- [ ] No client-supplied completion time is ever emitted.
- [ ] Player receives no board payload during host preview.
- [ ] `word_correct` only affects the receiving client's board.

---

## Open Questions
Inherits `.claude/roadmap/00-overview.md`. Frontend-specific:
- ⚠️ **Podium source:** use the `podium` event (recommended, ordered ascending) vs deriving from the overloaded `game_over.scores`. Planned: use `podium`. Confirm.

### Resolved
- Time formatting: seconds with 2 decimals (e.g. `21.34s`). ✔
