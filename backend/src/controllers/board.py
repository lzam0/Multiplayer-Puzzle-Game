import math
import random
import time
from dataclasses import dataclass

MAX_GEN_ATTEMPTS = 60
GEN_TIME_BUDGET_S = 0.75

type Grid = list[list[str | None]]
type Cell = tuple[int, int]


@dataclass
class LetterGrid:
    letters: list[list[str]]
    words: list[str]
    rows: int
    cols: int
    paths: dict[str, list[int]]  # word → flat cell indices of its canonical path


def generate_grid(words: list[str]) -> LetterGrid:
    if not words:
        raise ValueError("Cannot generate a board from an empty word list")

    clean = [w.upper() for w in words]

    total = sum(len(w) for w in clean)
    rows, cols = _choose_dimensions(total)
    ordered = sorted(clean, key=len, reverse=True)

    result = _try_generate(ordered, rows, cols, strict=True)
    if result is None:
        result = _try_generate(ordered, rows, cols, strict=False)
    if result is None:
        raise ValueError("Could not generate a board")

    letters, paths = result
    return LetterGrid(letters=letters, words=clean, rows=rows, cols=cols, paths=paths)


def _choose_dimensions(total: int) -> tuple[int, int]:
    padded = math.ceil(total * 1.5)
    rows = math.ceil(math.sqrt(padded))
    cols = math.ceil(padded / rows)
    return rows, cols


def _try_generate(
    ordered: list[str], rows: int, cols: int, strict: bool
) -> tuple[list[list[str]], dict[str, list[int]]] | None:
    deadline = time.monotonic() + GEN_TIME_BUDGET_S
    for _ in range(MAX_GEN_ATTEMPTS):
        if time.monotonic() > deadline:
            break
        grid: Grid = [[None] * cols for _ in range(rows)]
        paths: dict[str, list[int]] = {}
        if _place_words(ordered, 0, grid, rows, cols, deadline, strict, paths):
            letters = [[c if c is not None else "" for c in row] for row in grid]
            return letters, paths
    return None


def _place_words(
    words: list[str],
    i: int,
    grid: Grid,
    rows: int,
    cols: int,
    deadline: float,
    strict: bool,
    paths: dict[str, list[int]],
) -> bool:
    if time.monotonic() > deadline:
        return False
    if i == len(words):
        if not strict:
            return True
        return all(_count_paths(w, grid, rows, cols) == 1 for w in words)

    word = words[i]
    starts: list[Cell] = [(r, c) for r in range(rows) for c in range(cols) if grid[r][c] is None]
    random.shuffle(starts)

    for start in starts:
        if time.monotonic() > deadline:
            return False
        path: list[Cell] = []
        path_set: set[Cell] = set()
        if _trace_path(word, 0, start, grid, rows, cols, path, path_set, deadline):
            for k, cell in enumerate(path):
                grid[cell[0]][cell[1]] = word[k]
            paths[word] = [r * cols + c for r, c in path]
            if _place_words(words, i + 1, grid, rows, cols, deadline, strict, paths):
                return True
            del paths[word]
            for cell in path:
                grid[cell[0]][cell[1]] = None

    return False


def _trace_path(
    word: str,
    k: int,
    cell: Cell,
    grid: Grid,
    rows: int,
    cols: int,
    path: list[Cell],
    path_set: set[Cell],
    deadline: float,
) -> bool:
    if time.monotonic() > deadline:
        return False
    r, c = cell
    if grid[r][c] is not None:
        return False
    if cell in path_set:
        return False
    path.append(cell)
    path_set.add(cell)
    if k == len(word) - 1:
        return True
    neighbors: list[Cell] = []
    for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        nr, nc = r + dr, c + dc
        if 0 <= nr < rows and 0 <= nc < cols:
            neighbors.append((nr, nc))
    random.shuffle(neighbors)
    for nxt in neighbors:
        if _trace_path(word, k + 1, nxt, grid, rows, cols, path, path_set, deadline):
            return True
    path.pop()
    path_set.discard(cell)
    return False


def _count_paths(word: str, grid: Grid, rows: int, cols: int) -> int:
    total = [0]

    def dfs(k: int, r: int, c: int, seen: set[int]) -> None:
        if total[0] >= 2:
            return
        if not (0 <= r < rows and 0 <= c < cols):
            return
        if grid[r][c] != word[k]:
            return
        idx = r * cols + c
        if idx in seen:
            return
        if k == len(word) - 1:
            total[0] += 1
            return
        seen.add(idx)
        for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            dfs(k + 1, r + dr, c + dc, seen)
        seen.discard(idx)

    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == word[0]:
                dfs(0, r, c, set())
                if total[0] >= 2:
                    return 2

    return total[0]
