# Phase 3 — Board Visual Identity (sparse grid + word-counter UI)

**Branch:** `feature/board-visual-identity`
**Complexity:** M
**Depends on:** Phase 2 (frontend experience complete)
**Part of:** WEND Roadmap (`.claude/roadmap/00-overview.md`)

---

## Problem

The current board looks like an ordinary word search: every cell is filled, the grid is solid, and words blend in with noise characters. WEND's grid should be **distinctive** — only the word paths have letters; cells that belong to no word are visually dead (greyed-out). This gives the board a puzzle-piece silhouette rather than a filled rectangle.

Additionally, there is no word-progress indicator for players. They need a counter panel (like letter-slot boxes `[_][_][_]`) that ticks off each word as they find it. The host reference board should present the full word list as a legible checklist alongside the larger grid.

---

## Goals

- **Sparse grid:** Only word-path cells hold letters. All other cells are empty and rendered as inert grey tiles. The board silhouette becomes irregular and distinctive.
- **Word-counter panel (player):** Below the board, one row per word — `N` grey boxes representing letter count. When the player finds a word, its boxes fill green and the letters appear inside them. The panel acts as both a find-list and a progress bar.
- **Host word checklist:** During active rounds the reference board displays the full word list (actual letters, not boxes) in a checklist. Words are pre-revealed to the host (they saw the preview). As players finish, the FinishTracker already shows times; this checklist is a static reference, not real-time per-word tracking.
- **Host reference board layout:** Larger grid (appropriate for a big screen), word checklist displayed alongside the board in a two-column layout.

---

## Non-Goals (this phase)

- Per-word completion tracking on the host (server would need to broadcast `word_correct` to the host; out of scope without a backend change).
- Diagonal word placement.
- Animations on word discovery.
- Board zooming or panning.

---

## Architecture

### Backend changes

| File | What changes |
|---|---|
| `backend/src/game/game.service.ts` | Remove the full-fill requirement from `generateGrid`. After all words are placed, remaining `null` cells stay null. Return them as `''` (empty string) in `LetterGrid.letters`. Update `placeWords` success condition: succeeds when all words are placed, not when all cells are filled. |
| `backend/src/game/game.service.spec.ts` | Update grid-full assertion; add test that non-word cells are `''` and that the board still contains all word letters in valid paths. |

**Key constraint:** `validateTrace` already ignores non-word cells — it checks membership in `board.words` and adjacency, not whether a cell is filled. No changes needed there.

**Grid shape note:** Because total letters no longer need to factor into a rectangle, `chooseDimensions` should now target a grid *large enough* to hold all words with some breathing room, not exact-fit. A simple heuristic: `rows = ceil(sqrt(total * 1.5))`, `cols = ceil(total * 1.5 / rows)`, ensuring `rows * cols >= total`. This gives a roomier, more irregular silhouette.

### Frontend changes

| File | What changes |
|---|---|
| `frontend/src/components/LetterBoard.tsx` | Render cells where `letter === ''` as inert grey tiles: no `data-idx`, no pointer events, distinct grey background. Non-empty cells keep current behaviour. |
| `frontend/src/components/WordTracer.tsx` | `getCellIndexFromPoint` already skips cells without `data-idx` — no change needed. |
| `frontend/src/components/WordCounter.tsx` | **New.** Renders one row per word in `board.words`. Each row: `N` boxes. Unfound word: all boxes are grey `[_]`. Found word: boxes fill green with the letters revealed inside. Props: `words: string[]`, `foundWords: string[]`. |
| `frontend/src/app/play/[code]/PlayerView.tsx` | Replace `FoundWords` component with `WordCounter` below the board during the `active` phase. |
| `frontend/src/app/host/[code]/HostView.tsx` | In `active` phase: two-column layout — board on left (larger cells), word checklist on right (actual letters, checkbox icon, no real-time tick). In `preview` phase: same two-column layout with all words pre-checked/revealed. |
| `frontend/src/components/HostBoardPreview.tsx` | Remove the separate word-tag list at the bottom; words will be shown in the adjacent checklist column instead. |

### New component: `WordCounter`

```
┌─────────────────────────────┐
│  [C][A][T]        ✓ found   │
│  [D][O][G]        ✓ found   │
│  [_][_][_][_]               │  ← unfound, shows blank boxes
│  [_][_][_][_][_]            │  ← unfound
└─────────────────────────────┘
```

- Sorted: found words listed first (greyed + checkmark), unfound below.
- Letter boxes use a monospaced pill style.
- Component is **player-only** — host sees the actual word strings (they already know).

### Host two-column layout (active phase)

```
┌──────────────────────────────────────────────────────┐
│  Round 2 of 3 · Animals               [1:23 remaining]│
├─────────────────────────┬────────────────────────────┤
│                         │  Words to find             │
│   [ large LetterBoard ] │  ✓ CAT                     │
│                         │  ✓ DOG                     │
│                         │    ELEPHANT                │
│                         │    TIGER                   │
│                         │    LION                    │
├─────────────────────────┴────────────────────────────┤
│  Finishers  →  Alice 21.34s · Bob 35.10s             │
│                                      [End Round Early]│
└──────────────────────────────────────────────────────┘
```

Words shown as plain text (host already knows them). No ticking — host does not receive `word_correct`. A strikethrough style could be applied if a backend change later broadcasts word-discovery events to the host.

---

## Sizing / cell sizing

| Context | Cell size |
|---|---|
| Player board (phone) | `w-10 h-10` (current) — keep |
| Host reference board (big screen) | `w-14 h-14` or `w-16 h-16` via a `size` prop on `LetterBoard` |
| Host preview board | Same as host reference |

Add an optional `cellSize?: 'sm' | 'md' | 'lg'` prop to `LetterBoard` that maps to Tailwind size classes.

---

## Verification Steps

### Happy path
1. Start a game. Inspect board payload — non-word cells should have `letter === ''`.
2. Host preview shows the board with grey dead cells and words clearly visible as connected paths.
3. Player board shows grey dead cells; word paths are white (normal) initially.
4. Player traces `CAT` correctly → those 3 cells turn green; `WordCounter` row for CAT fills with letters.
5. Player finishes all words → all `WordCounter` rows filled green; board locked.
6. Host reference board shows word checklist (static, not ticked in real time).

### Edge cases
- [ ] Grey cells cannot be traced through (no `data-idx` → `getCellIndexFromPoint` returns null mid-trace).
- [ ] `foundIndices` passed to `LetterBoard` only include cells of found words; dead cells are never in `foundIndices`.
- [ ] Host two-column layout doesn't overflow on a 1080p screen.
- [ ] Word list is sorted longest-first or alphabetically — confirm preference.

---

## Open Questions

- **Grey cell appearance:** fully dark (`bg-gray-700`)? or a subtle dot pattern to suggest "empty slot"?
- **Word sort order in checklist:** by length (longest first, matching board gen order) vs. alphabetical vs. discovery order?
- **`chooseDimensions` heuristic:** 1.5× padding factor is a starting guess. May need tuning based on playtest — small topics (5 words) might produce very sparse boards.
- **`FoundWords` component:** still used in host view's preview word list; keep or consolidate into `WordCounter`?
