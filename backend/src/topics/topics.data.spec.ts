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

      it('generates a fully-filled board', () => {
        const board = game.generateGrid(topic.words);
        const filled = board.letters.every((r) =>
          r.every((c) => /^[A-Z]$/.test(c)),
        );
        expect(filled).toBe(true);
        expect(board.rows * board.cols).toBe(
          topic.words.reduce((n, w) => n + w.length, 0),
        );
      });
    });
  }
});
