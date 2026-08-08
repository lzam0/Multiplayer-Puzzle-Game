# WEND Board Generation

## Overview

The board generator takes a list of 6 words (3–8 letters each) and places them on a sparse rectangular grid. Non-word cells are left empty and rendered as inert grey tiles on the player's screen, giving the board an irregular, puzzle-piece silhouette rather than a solid filled rectangle.

The implementation lives in `backend/src/controllers/board.py`.

## Grid Sizing

Grid dimensions are chosen to be ~1.5× larger than the total letter count, ensuring breathing room for the irregular layout:

```
padded = ceil(totalLetters × 1.5)
rows   = ceil(sqrt(padded))
cols   = ceil(padded / rows)
```

Example — 6 words totalling 28 letters:
- `padded = ceil(28 × 1.5) = 42`
- `rows = ceil(sqrt(42)) = 7`
- `cols = ceil(42 / 7) = 6`
- Grid: 7×6 = 42 cells, 28 word cells, 14 dead cells

## Placement Algorithm

Words are placed using randomised snake-fill with backtracking:

1. Sort words longest-first (hardest to place go first)
2. For each word, shuffle all empty cells as candidate start positions
3. From each candidate, attempt to walk the word letter-by-letter to orthogonally adjacent empty cells (DFS)
4. If a path is found, write the letters to the grid and recurse to the next word
5. If the next word fails to place, backtrack: erase the current word's cells and try the next candidate start
6. Retry the whole attempt up to `MAX_GEN_ATTEMPTS = 60` times with fresh randomisation

```
place_words(words, i, grid):
  if i == len(words):
    if strict:
      return all(count_paths(w, grid) == 1 for w in words)
    return True
  for each shuffled empty cell as start:
    if trace_path(word[i], start, grid):
      write word[i] to grid; record flat-index path
      if place_words(words, i+1, grid): return True
      erase word[i] from grid   # backtrack
  return False
```

## Two-Pass Strategy

`generate_grid` attempts placement twice:

1. **Strict pass** (`strict=True`, 750ms budget) — after all words are placed, verifies that each word has exactly one valid orthogonal path. This prevents a player from accidentally tracing a word through another word's cells (e.g. tracing OWL through WOLF's W→O→L cells). If the whole attempt succeeds, the board is returned.

2. **Relaxed pass** (`strict=False`, 750ms budget) — run only if the strict pass exhausts its budget. Words are placed in non-overlapping cells but the single-path constraint is dropped. A board is always produced unless the word list itself is invalid.

## Uniqueness Check

```
count_paths(word, grid):
  DFS from every cell matching word[0]
  count all complete paths spelling the word
  stop early if count >= 2 (short-circuit)
  return count
```

If `count_paths` returns > 1 for any word, the layout is rejected and the retry loop generates a fresh attempt.

## Output

`generate_grid` returns a `LetterGrid` dataclass:

```python
@dataclass
class LetterGrid:
    letters: list[list[str]]         # rows × cols; non-word cells are ''
    words:   list[str]               # uppercased word list
    rows:    int
    cols:    int
    paths:   dict[str, list[int]]    # word → flat cell indices of its canonical path
```

The `paths` dict is included so consumers can verify that a player's trace follows the canonical path exactly. In solo mode this validation is done client-side; in multiplayer it will be done server-side in the `trace_word` handler.

Empty cells (`''`) carry no `data-idx` attribute in the frontend and are skipped by the word tracer automatically.

## Cell Index Encoding

Flat index used by `trace_word` events and the `paths` dict:

```
row = Math.floor(idx / cols)   // JS
col = idx % cols

row = idx // cols              # Python
col = idx % cols
```

## Constraints

| Rule | Enforced by |
|---|---|
| No two words share a cell | `_place_words` only walks to `None` cells |
| All adjacency is orthogonal only | `_trace_path` checks ±1 row or ±1 col neighbours only |
| Each word has exactly one path (strict pass) | `_count_paths` check at base case |
| Non-word cells are `''` in output | `c if c is not None else ''` at grid export |

## Failure Mode

If both passes exhaust their budgets without finding a valid layout, `generate_grid` raises:
```
ValueError: Could not generate a board
```

The socket handler catches this and emits an `error` event to the host. In practice this is rare — the 1.5× grid padding gives the packer plenty of room, and the prefix-pair filter in `generate_words` removes the most common cause of hard-to-place word lists.
