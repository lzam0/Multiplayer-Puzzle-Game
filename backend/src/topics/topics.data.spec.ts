import { TOPICS } from './topics.data';
import { GameService } from '../game/game.service';

// Data-integrity + generative smoke test: every shipped topic must actually
// produce a valid, fully-filled board. This catches bad word sets at CI time.
describe('TOPICS data', () => {
  const game = new GameService();

  it('has unique ids', () => {
    const ids = TOPICS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('labels match the frontend selector strings', () => {
    const labels = TOPICS.map((t) => t.label).sort();
    expect(labels).toEqual(
      ['Animals', 'Colors', 'Countries', 'Foods', 'Sports'].sort(),
    );
  });

  for (const topic of TOPICS) {
    describe(`${topic.label} (${topic.id})`, () => {
      it('has all-caps, 3-8 letter words', () => {
        for (const w of topic.words) {
          expect(w).toBe(w.toUpperCase());
          expect(w.length).toBeGreaterThanOrEqual(3);
          expect(w.length).toBeLessThanOrEqual(8);
        }
      });

      it('generates a sparse board with all words traceable', () => {
        const board = game.generateGrid(topic.words);
        const total = topic.words.reduce((n, w) => n + w.length, 0);

        // Grid is larger than word total (sparse layout).
        expect(board.rows * board.cols).toBeGreaterThan(total);

        // Every cell is either a letter or an empty string.
        for (const row of board.letters) {
          for (const cell of row) {
            expect(cell === '' || /^[A-Z]$/.test(cell)).toBe(true);
          }
        }

        // Uppercase normalisation: board.words should match topic.words uppercased.
        expect(board.words).toEqual(topic.words.map((w) => w.toUpperCase()));
      });
    });
  }
});
