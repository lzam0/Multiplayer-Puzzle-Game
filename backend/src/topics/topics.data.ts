import { Topic } from '../game/game.types';

// ---------------------------------------------------------------------------
// Static topic data. No database needed.
//
// Labels MUST match the frontend TopicSelector strings exactly
// (Animals, Foods, Countries, Colors, Sports) so resolveTopic() matches by
// label without any frontend change.
//
// Guidelines (see docs/topics.md):
// - ALL CAPS, 3-8 letters per word.
// - Total letter count should form a fillable grid (near-square).
//   The packer targets cols = ceil(sqrt(total)); we keep totals to sums that
//   factor cleanly (e.g. 24 -> 6x4, 25 -> 5x5, 30 -> 6x5) for reliable fills.
// ---------------------------------------------------------------------------

export const TOPICS: Topic[] = [
  {
    id: 'animals',
    label: 'Animals',
    // 3+3+3+4+4+4+3 = 24 letters -> 6x4
    words: ['CAT', 'FOX', 'OWL', 'WOLF', 'BEAR', 'DEER', 'RAM'],
  },
  {
    id: 'foods',
    label: 'Foods',
    // 4+4+4+4+4+4 = 24 letters -> 6x4
    words: ['RICE', 'CAKE', 'SOUP', 'TACO', 'PEAR', 'CORN'],
  },
  {
    id: 'countries',
    label: 'Countries',
    // 5+5+5+5 = 20 letters -> 5x4
    words: ['SPAIN', 'CHINA', 'INDIA', 'CHILE'],
  },
  {
    id: 'colors',
    label: 'Colors',
    // 3+4+4+4+5+4 = 24 letters -> 6x4
    words: ['RED', 'BLUE', 'PINK', 'GOLD', 'GREEN', 'GRAY'],
  },
  {
    id: 'sports',
    label: 'Sports',
    // 4+4+4+4+5+4 = 25 letters -> 5x5
    words: ['GOLF', 'SWIM', 'JUDO', 'POLO', 'RUGBY', 'SURF'],
  },
];
