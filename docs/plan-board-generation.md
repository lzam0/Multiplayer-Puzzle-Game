# WEND Board Generation

## Overview

The board generator takes a list of words (4–7 words, 3–8 letters each) and places them on a sparse rectangular grid. Non-word cells are left empty and rendered as inert grey tiles on the player's screen, giving the board an irregular, puzzle-piece silhouette rather than a solid filled rectangle.

## Grid Sizing

Grid dimensions are chosen to be ~1.5× larger than the total letter count, ensuring breathing room for the irregular layout:

```
padded = ceil(totalLetters × 1.5)
rows   = ceil(sqrt(padded))
cols   = ceil(padded / rows)
```

Example — 7 words totalling 30 letters:
- `padded = ceil(30 × 1.5) = 45`
- `rows = ceil(sqrt(45)) = 7`
- `cols = ceil(45 / 7) = 7`
- Grid: 7×7 = 49 cells, 30 word cells, 19 dead cells

## Placement Algorithm

Words are placed using randomised snake-fill with backtracking:

1. Sort words longest-first (hardest to place go first)
2. For each word, shuffle all empty cells as candidate start positions
3. From each candidate, attempt to walk the word letter-by-letter to orthogonally adjacent empty cells (DFS)
4. If a path is found, write the letters to the grid and recurse to the next word
5. If the next word fails to place, backtrack: erase the current word's cells and try the next candidate start
6. Retry the whole attempt up to `MAX_GEN_ATTEMPTS` times with fresh randomisation

```
placeWords(words, i, grid):
  if i === words.length:
    return validateUniqueness(words, grid)  ← see below
  for each shuffled empty cell as start:
    if tracePath(word[i], start, grid):
      write word[i] to grid
      if placeWords(words, i+1, grid): return true
      erase word[i] from grid  ← backtrack
  return false
```

## Uniqueness Enforcement

After all words are placed, the generator verifies that each word has **exactly one** valid orthogonal path on the grid. This prevents a player from accidentally tracing one word through another word's adjacent cells (e.g. tracing OWL through WOLF's W→O→L cells).

If any word has more than one valid path, the layout is rejected and the retry loop generates a fresh attempt.

```
countPaths(word, grid):
  DFS from every cell matching word[0]
  count all complete paths spelling the word
  return count

validateUniqueness(words, grid):
  return words.every(w => countPaths(w, grid) === 1)
```

## Output

`generateGrid` returns a `LetterGrid`:

```typescript
interface LetterGrid {
  letters: string[][];  // rows × cols; non-word cells are ''
  words:   string[];    // uppercased word list
  rows:    number;
  cols:    number;
}
```

Empty cells (`''`) carry no `data-idx` attribute in the frontend and are skipped by the word tracer automatically.

## Cell Index Encoding

Flat index used by `trace_word` events:

```
row = Math.floor(idx / cols)
col = idx % cols
```

`validateTrace` on the backend uses the same encoding to reconstruct the word from submitted indices and check adjacency.

## Constraints

| Rule | Enforced by |
|---|---|
| No two words share a cell | `placeWords` only walks to `null` cells |
| All adjacency is orthogonal only | `neighbors()` returns up, down, left, right only |
| Each word has exactly one path | `countPaths` check at base case |
| Non-word cells are `''` in output | `grid.map(r => r.map(c => c ?? ''))` |

## Failure Mode

If `MAX_GEN_ATTEMPTS` is exhausted without finding a valid unique layout, `generateGrid` throws:
```
Error: Could not generate a board
```

The gateway catches this and emits an `error` event to the host. In practice this is rare — the 1.5× grid padding gives the packer plenty of room.
