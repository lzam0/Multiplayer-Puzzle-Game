import { Injectable } from '@nestjs/common';
import { LetterGrid, Round, RoundRankEntry, Player } from './game.types';
import { MAX_GEN_ATTEMPTS, GEN_TIME_BUDGET_MS, NON_FINISH_PENALTY_MS } from './game.constants';

type Cell = { row: number; col: number };

@Injectable()
export class GameService {
  // -------------------------------------------------------------------------
  // Board generation
  // -------------------------------------------------------------------------

  /**
   * Pack `words` into a sparse rectangular grid. Each word occupies a
   * contiguous, orthogonally-adjacent path; no two words share a cell.
   * Non-word cells are left as '' (empty). Uses randomized snake-fill with
   * backtracking, retried until all words are placed within MAX_GEN_ATTEMPTS.
   */
  generateGrid(words: string[]): LetterGrid {
    if (!words || words.length === 0) {
      throw new Error('Cannot generate a board from an empty word list');
    }
    const clean = words.map((w) => w.toUpperCase());
    const total = clean.reduce((n, w) => n + w.length, 0);

    const { rows, cols } = this.chooseDimensions(total);

    // Longest words first — they are the hardest to place.
    const ordered = [...clean].sort((a, b) => b.length - a.length);

    const tryGenerate = (strict: boolean): LetterGrid | null => {
      const deadline = Date.now() + GEN_TIME_BUDGET_MS;
      for (let attempt = 0; attempt < MAX_GEN_ATTEMPTS; attempt++) {
        if (Date.now() > deadline) break;
        const grid: (string | null)[][] = Array.from({ length: rows }, () =>
          Array.from({ length: cols }, () => null),
        );
        if (this.placeWords(ordered, 0, grid, rows, cols, deadline, strict)) {
          return {
            letters: grid.map((r) => r.map((c) => c ?? '')),
            words: clean,
            rows,
            cols,
          };
        }
      }
      return null;
    };

    const strict = tryGenerate(true);
    if (strict) return strict;

    const relaxed = tryGenerate(false);
    if (relaxed) return relaxed;

    throw new Error('Could not generate a board');
  }

  /**
   * Choose grid dimensions large enough to hold all word letters with ~50%
   * breathing room for the sparse layout. The grid will always be larger than
   * the total letter count, leaving dead cells for the irregular silhouette.
   */
  private chooseDimensions(total: number): { rows: number; cols: number } {
    const padded = Math.ceil(total * 1.5);
    const rows = Math.ceil(Math.sqrt(padded));
    const cols = Math.ceil(padded / rows);
    return { rows, cols };
  }

  /** Recursively place words[i..] into the grid. Returns true when all words are placed. When strict=true, also verifies each word has exactly one valid path. */
  private placeWords(
    words: string[],
    i: number,
    grid: (string | null)[][],
    rows: number,
    cols: number,
    deadline: number,
    strict = true,
  ): boolean {
    if (Date.now() > deadline) return false;
    if (i === words.length) {
      if (!strict) return true;
      // Each word must have exactly one valid path on the board so that no word
      // can be accidentally found by tracing another word's adjacent cells.
      return words.every((w) => this.countPaths(w, grid, rows, cols) === 1);
    }
    const word = words[i];
    const starts = this.shuffle(this.emptyCells(grid, rows, cols));
    for (const start of starts) {
      if (Date.now() > deadline) return false;
      const path: Cell[] = [];
      if (this.tracePath(word, 0, start, grid, rows, cols, path, deadline)) {
        for (let k = 0; k < path.length; k++) {
          grid[path[k].row][path[k].col] = word[k];
        }
        if (this.placeWords(words, i + 1, grid, rows, cols, deadline, strict)) return true;
        // Backtrack.
        for (const cell of path) grid[cell.row][cell.col] = null;
      }
    }
    return false;
  }

  /** Try to lay `word[k..]` starting at `cell`, walking to adjacent empty cells. */
  private tracePath(
    word: string,
    k: number,
    cell: Cell,
    grid: (string | null)[][],
    rows: number,
    cols: number,
    path: Cell[],
    deadline: number,
  ): boolean {
    if (Date.now() > deadline) return false;
    if (grid[cell.row][cell.col] !== null) return false;
    if (path.some((c) => c.row === cell.row && c.col === cell.col))
      return false;
    path.push(cell);
    if (k === word.length - 1) return true;
    for (const next of this.shuffle(this.neighbors(cell, rows, cols))) {
      if (this.tracePath(word, k + 1, next, grid, rows, cols, path, deadline))
        return true;
    }
    path.pop();
    return false;
  }

  /**
   * Count distinct orthogonal paths on the grid that spell `word`, capped at 2.
   * The uniqueness gate only needs "exactly one" vs "not exactly one", so
   * counting beyond 2 is wasted work — stopping early cuts exponential DFS cost
   * on high-overlap word lists.
   */
  private countPaths(
    word: string,
    grid: (string | null)[][],
    rows: number,
    cols: number,
  ): number {
    let total = 0;
    const dfs = (k: number, r: number, c: number, seen: Set<number>): void => {
      if (total >= 2) return;
      if (r < 0 || r >= rows || c < 0 || c >= cols) return;
      if (grid[r][c] !== word[k]) return;
      const idx = r * cols + c;
      if (seen.has(idx)) return;
      if (k === word.length - 1) {
        total++;
        return;
      }
      seen.add(idx);
      dfs(k + 1, r - 1, c, seen);
      dfs(k + 1, r + 1, c, seen);
      dfs(k + 1, r, c - 1, seen);
      dfs(k + 1, r, c + 1, seen);
      seen.delete(idx);
    };
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (total >= 2) break;
        dfs(0, r, c, new Set());
      }
    }
    return total;
  }

  private neighbors(cell: Cell, rows: number, cols: number): Cell[] {
    const out: Cell[] = [];
    if (cell.row > 0) out.push({ row: cell.row - 1, col: cell.col });
    if (cell.row < rows - 1) out.push({ row: cell.row + 1, col: cell.col });
    if (cell.col > 0) out.push({ row: cell.row, col: cell.col - 1 });
    if (cell.col < cols - 1) out.push({ row: cell.row, col: cell.col + 1 });
    return out;
  }

  private emptyCells(
    grid: (string | null)[][],
    rows: number,
    cols: number,
  ): Cell[] {
    const out: Cell[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === null) out.push({ row: r, col: c });
      }
    }
    return out;
  }

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // -------------------------------------------------------------------------
  // Trace validation
  // -------------------------------------------------------------------------

  /**
   * Convert flat letter indices to a word. Index encoding matches the frontend
   * WordTracer: row = floor(idx / cols), col = idx % cols.
   */
  indicesToWord(board: LetterGrid, letterIndices: number[]): string {
    return letterIndices
      .map((idx) => {
        const row = Math.floor(idx / board.cols);
        const col = idx % board.cols;
        return board.letters[row]?.[col] ?? '';
      })
      .join('');
  }

  /**
   * Validate that the flat indices form an orthogonally-adjacent, non-repeating
   * path (no diagonals). Also bounds-checks each index against the grid.
   */
  isAdjacentPath(rows: number, cols: number, letterIndices: number[]): boolean {
    if (letterIndices.length === 0) return false;
    const seen = new Set<number>();
    for (const idx of letterIndices) {
      if (!Number.isInteger(idx) || idx < 0 || idx >= rows * cols) return false;
      if (seen.has(idx)) return false;
      seen.add(idx);
    }
    for (let i = 1; i < letterIndices.length; i++) {
      const prev = letterIndices[i - 1];
      const cur = letterIndices[i];
      const pr = Math.floor(prev / cols);
      const pc = prev % cols;
      const cr = Math.floor(cur / cols);
      const cc = cur % cols;
      const dRow = Math.abs(cr - pr);
      const dCol = Math.abs(cc - pc);
      const orthogonal =
        (dRow === 1 && dCol === 0) || (dRow === 0 && dCol === 1);
      if (!orthogonal) return false;
    }
    return true;
  }

  /**
   * Full server-side validation of a trace submission. The client-supplied word
   * string is never trusted alone — it must match the letters at the traced path.
   */
  validateTrace(
    board: LetterGrid,
    playerFoundWords: string[],
    word: string,
    letterIndices: number[],
  ): 'correct' | 'incorrect' {
    if (!this.isAdjacentPath(board.rows, board.cols, letterIndices)) {
      return 'incorrect';
    }
    const traced = this.indicesToWord(board, letterIndices);
    const claimed = (word ?? '').toUpperCase();
    if (traced !== claimed) return 'incorrect';
    if (!board.words.includes(traced)) return 'incorrect';
    if (playerFoundWords.includes(traced)) return 'incorrect';
    return 'correct';
  }

  // -------------------------------------------------------------------------
  // Ranking
  // -------------------------------------------------------------------------

  /**
   * Rank a completed round. Finishers (completedAt != null) come first, ordered
   * by completion time ascending and charged their actual time. Non-finishers
   * follow, ordered by words found descending, each charged NON_FINISH_PENALTY_MS.
   */
  rankRound(round: Round, players: Player[]): RoundRankEntry[] {
    const nameOf = new Map(players.map((p) => [p.id, p.name]));

    const entries = [...round.playerStates.values()].map((s) => ({
      playerId: s.playerId,
      name: nameOf.get(s.playerId) ?? '?',
      completionTimeMs: s.completedAt,
      wordsFound: s.foundWords.length,
    }));

    const finishers = entries
      .filter((e) => e.completionTimeMs !== null)
      .sort(
        (a, b) =>
          (a.completionTimeMs as number) - (b.completionTimeMs as number),
      );
    const nonFinishers = entries
      .filter((e) => e.completionTimeMs === null)
      .sort((a, b) => b.wordsFound - a.wordsFound);

    const ranked: RoundRankEntry[] = [];
    let rank = 1;
    for (const e of finishers) {
      ranked.push({
        ...e,
        rank: rank++,
        chargedMs: e.completionTimeMs as number,
      });
    }
    for (const e of nonFinishers) {
      ranked.push({
        ...e,
        rank: rank++,
        chargedMs: NON_FINISH_PENALTY_MS,
      });
    }
    return ranked;
  }
}
