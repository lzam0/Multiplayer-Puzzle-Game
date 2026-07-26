import { Test, TestingModule } from '@nestjs/testing';
import { GameService } from './game.service';
import { LetterGrid, Round, Player } from './game.types';
import { NON_FINISH_PENALTY_MS } from './game.constants';

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
    it('produces a fully-filled grid with every word traceable', () => {
      const words = ['CAT', 'FOX', 'OWL', 'WOLF', 'BEAR', 'DEER', 'RAM'];
      const board = service.generateGrid(words);

      expect(board.rows * board.cols).toBe(
        words.reduce((n, w) => n + w.length, 0),
      );
      expect(board.words).toEqual(words);

      // Every cell filled.
      for (const row of board.letters) {
        for (const cell of row) {
          expect(cell).toMatch(/^[A-Z]$/);
        }
      }

      // Each word must exist as an adjacent path somewhere on the board.
      for (const w of words) {
        expect(findWordPath(board, w)).not.toBeNull();
      }
    });

    it('throws on an empty word list', () => {
      expect(() => service.generateGrid([])).toThrow();
    });

    it('throws when letters cannot exactly fill a rectangle', () => {
      // 7 letters -> ceil(sqrt(7))=3 cols, ceil(7/3)=3 rows = 9 != 7.
      expect(() => service.generateGrid(['ABCDEFG'])).toThrow();
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
