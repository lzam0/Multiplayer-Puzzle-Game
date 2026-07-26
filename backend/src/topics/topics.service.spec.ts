import { Test, TestingModule } from '@nestjs/testing';
import { TopicsService } from './topics.service';

describe('TopicsService', () => {
  let service: TopicsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TopicsService],
    }).compile();
    service = module.get<TopicsService>(TopicsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns all topics', () => {
    expect(service.getTopics().length).toBeGreaterThan(0);
  });

  it('resolves a topic by id', () => {
    expect(service.resolveTopic('animals')?.label).toBe('Animals');
  });

  it('resolves a topic by case-insensitive label (frontend sends labels)', () => {
    expect(service.resolveTopic('Animals')?.id).toBe('animals');
    expect(service.resolveTopic('aNiMaLs')?.id).toBe('animals');
  });

  it('returns undefined for an unknown topic', () => {
    expect(service.resolveTopic('does-not-exist')).toBeUndefined();
    expect(service.getWords('nope')).toBeUndefined();
  });

  it('returns words for a resolved topic', () => {
    const words = service.getWords('Sports');
    expect(words).toBeDefined();
    expect(words!.length).toBeGreaterThan(0);
  });

  it('every topic has valid words that factor into a non-degenerate grid', () => {
    for (const t of service.getTopics()) {
      expect(t.words.length).toBeGreaterThan(0);
      for (const w of t.words) {
        expect(w).toBe(w.toUpperCase());
        expect(w.length).toBeGreaterThanOrEqual(3);
        expect(w.length).toBeLessThanOrEqual(8);
      }
      // Total letters must have a factor pair with rows >= 2 (matches the
      // packer's chooseDimensions), i.e. not prime / not 1xN only.
      const total = t.words.reduce((n, w) => n + w.length, 0);
      let hasFactor = false;
      for (let rows = Math.floor(Math.sqrt(total)); rows >= 2; rows--) {
        if (total % rows === 0) {
          hasFactor = true;
          break;
        }
      }
      expect(hasFactor).toBe(true);
    }
  });
});
