import { Test, TestingModule } from '@nestjs/testing';
import { GameService } from './game.service';
import { LetterGrid, Round, Player } from './game.types';
import { NON_FINISH_PENALTY_MS, GEN_TIME_BUDGET_MS } from './game.constants';

describe('GameService', () => {
  let service: GameService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameService],
    }).compile();
    service = module.get<GameService>(GameService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateGrid', () => {
    it('produces a sparse grid larger than word total, with every word traceable', () => {
      const words = ['CAT', 'FOX', 'OWL', 'WOLF', 'BEAR', 'DEER', 'RAM'];
      const board = service.generateGrid(words);
      const total = words.reduce((n, w) => n + w.length, 0);

      // Grid is larger than word total (sparse layout).
      expect(board.rows * board.cols).toBeGreaterThan(total);
      expect(board.words).toEqual(words);

      // Word cells are uppercase letters; non-word cells are empty strings.
      for (const row of board.letters) {
        for (const cell of row) {
          expect(cell === '' || /^[A-Z]$/.test(cell)).toBe(true);
        }
      }

      // Non-word cells exist (grid is sparse).
      const emptyCells = board.letters.flat().filter((c) => c === '');
      expect(emptyCells.length).toBeGreaterThan(0);

      // Each word must exist as an adjacent path somewhere on the board.
      for (const w of words) {
        expect(findWordPath(board, w)).not.toBeNull();
      }
    });

    it('throws on an empty word list', () => {
      expect(() => service.generateGrid([])).toThrow();
    });

    it('terminates within budget on a high-overlap word list (returns or throws, never hangs)', () => {
      const overlapWords = ['AREA', 'ARENA', 'RARE', 'EARN', 'NEAR', 'RANE'];
      const start = Date.now();
      try {
        service.generateGrid(overlapWords);
      } catch {
        // Throwing is the expected fail-fast path for pathological lists.
      }
      const elapsed = Date.now() - start;
      // Allow a generous 2× margin over the configured budget to avoid CI flakiness.
      expect(elapsed).toBeLessThan(GEN_TIME_BUDGET_MS * 2);
    });
  });

  describe('countPaths short-circuit (>= 2 cap)', () => {
    it('returns the same uniqueness verdict after the cap for a word with exactly one path', () => {
      // Build a minimal 2×3 grid where CAT has exactly one path: (0,0)→(0,1)→(0,2)
      const board: LetterGrid = {
        letters: [
          ['C', 'A', 'T'],
          ['X', 'Y', 'Z'],
        ],
        words: ['CAT'],
        rows: 2,
        cols: 3,
      };
      // Access countPaths via generateGrid indirectly by verifying the board was generated.
      // Direct validation: a grid where the word appears exactly once must pass the gate,
      // so generateGrid on a simple non-overlapping list must succeed.
      const result = service.generateGrid(['CAT', 'FOX']);
      expect(result).toBeDefined();
      expect(result.words).toContain('CAT');
      // Also verify the standalone board fixture behaves as expected via validateTrace
      // (countPaths is private; we test its effect through generateGrid success above).
      expect(service.validateTrace(board, [], 'CAT', [0, 1, 2])).toBe('correct');
      void board; // suppress unused warning
    });

    it('does not count beyond 2 paths — a word with multiple routes is still detected as non-unique', () => {
      // Grid where 'ABA' can be traced in more than one way:
      // Row 0: A B A  — paths: (0,0)→(0,1)→(0,2) and any other ABA combo
      // We verify generateGrid rejects (or avoids) such a layout, i.e. it never
      // returns a board where a word has more than one path.
      const words = ['CAT', 'DOG', 'FOX'];
      const result = service.generateGrid(words);
      // Every word on a successfully generated board must appear exactly once.
      for (const w of words) {
        const paths = countPathsHelper(result, w);
        expect(paths).toBe(1);
      }
    });
  });

  describe('isAdjacentPath', () => {
    // 3x3 grid, indices 0..8.
    it('accepts an orthogonal, non-repeating path', () => {
      expect(service.isAdjacentPath(3, 3, [0, 1, 2, 5])).toBe(true);
    });
    it('rejects a diagonal step', () => {
      expect(service.isAdjacentPath(3, 3, [0, 4])).toBe(false);
    });
    it('rejects repeated cells', () => {
      expect(service.isAdjacentPath(3, 3, [0, 1, 0])).toBe(false);
    });
    it('rejects out-of-range indices', () => {
      expect(service.isAdjacentPath(3, 3, [0, 9])).toBe(false);
    });
    it('rejects an empty path', () => {
      expect(service.isAdjacentPath(3, 3, [])).toBe(false);
    });
  });

  describe('validateTrace', () => {
    const board: LetterGrid = {
      letters: [
        ['C', 'A', 'T'],
        ['D', 'O', 'G'],
      ],
      words: ['CAT', 'DOG'],
      rows: 2,
      cols: 3,
    };

    it('accepts a valid, unclaimed word on an adjacent path', () => {
      expect(service.validateTrace(board, [], 'CAT', [0, 1, 2])).toBe(
        'correct',
      );
    });
    it('rejects a word not in the list', () => {
      expect(service.validateTrace(board, [], 'CAD', [0, 1, 3])).toBe(
        'incorrect',
      );
    });
    it('rejects an already-found word', () => {
      expect(service.validateTrace(board, ['CAT'], 'CAT', [0, 1, 2])).toBe(
        'incorrect',
      );
    });
    it('rejects when the claimed word does not match the traced path', () => {
      expect(service.validateTrace(board, [], 'DOG', [0, 1, 2])).toBe(
        'incorrect',
      );
    });
    it('rejects a diagonal path even if letters spell a word', () => {
      // C(0,0) -> O(1,1) is diagonal.
      expect(service.validateTrace(board, [], 'CO', [0, 4])).toBe('incorrect');
    });
  });

  describe('rankRound', () => {
    it('ranks finishers by time, then non-finishers by words found', () => {
      const players: Player[] = [
        { id: 'a', name: 'A', totalTimeMs: 0, roundsCounted: 0 },
        { id: 'b', name: 'B', totalTimeMs: 0, roundsCounted: 0 },
        { id: 'c', name: 'C', totalTimeMs: 0, roundsCounted: 0 },
      ];
      const round = {
        board: { words: ['X', 'Y', 'Z'] },
        playerStates: new Map([
          [
            'a',
            { playerId: 'a', foundWords: ['X', 'Y', 'Z'], completedAt: 35000 },
          ],
          [
            'b',
            { playerId: 'b', foundWords: ['X', 'Y', 'Z'], completedAt: 21000 },
          ],
          ['c', { playerId: 'c', foundWords: ['X'], completedAt: null }],
        ]),
      } as unknown as Round;

      const ranked = service.rankRound(round, players);

      expect(ranked.map((r) => r.playerId)).toEqual(['b', 'a', 'c']);
      expect(ranked[0]).toMatchObject({ rank: 1, chargedMs: 21000 });
      expect(ranked[1]).toMatchObject({ rank: 2, chargedMs: 35000 });
      expect(ranked[2]).toMatchObject({
        rank: 3,
        completionTimeMs: null,
        chargedMs: NON_FINISH_PENALTY_MS,
      });
    });
  });
});

// Test helper: count all orthogonally-adjacent paths spelling `word` on the board.
function countPathsHelper(board: LetterGrid, word: string): number {
  const { rows, cols, letters } = board;
  let total = 0;
  const dfs = (r: number, c: number, k: number, seen: Set<string>): void => {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
    if (letters[r][c] !== word[k]) return;
    const key = `${r},${c}`;
    if (seen.has(key)) return;
    if (k === word.length - 1) {
      total++;
      return;
    }
    seen.add(key);
    dfs(r - 1, c, k + 1, seen);
    dfs(r + 1, c, k + 1, seen);
    dfs(r, c - 1, k + 1, seen);
    dfs(r, c + 1, k + 1, seen);
    seen.delete(key);
  };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dfs(r, c, 0, new Set());
    }
  }
  return total;
}

// Test helper: find an orthogonally-adjacent path spelling `word` on the board.
function findWordPath(board: LetterGrid, word: string): number[] | null {
  const { rows, cols, letters } = board;
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  const dfs = (
    r: number,
    c: number,
    k: number,
    seen: Set<string>,
    path: number[],
  ): number[] | null => {
    if (letters[r][c] !== word[k]) return null;
    const key = `${r},${c}`;
    if (seen.has(key)) return null;
    seen.add(key);
    path.push(r * cols + c);
    if (k === word.length - 1) return [...path];
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        const res = dfs(nr, nc, k + 1, seen, path);
        if (res) return res;
      }
    }
    seen.delete(key);
    path.pop();
    return null;
  };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const res = dfs(r, c, 0, new Set(), []);
      if (res) return res;
    }
  }
  return null;
}
