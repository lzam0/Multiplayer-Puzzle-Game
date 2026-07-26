import { Test, TestingModule } from '@nestjs/testing';
import { TopicsService } from './topics.service';

const mockCreate = jest.fn();

jest.mock('groq-sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  })),
}));

describe('TopicsService', () => {
  let service: TopicsService;

  beforeEach(async () => {
    mockCreate.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [TopicsService],
    }).compile();
    service = module.get<TopicsService>(TopicsService);
  });

  const makeResponse = (content: string) => ({
    choices: [{ message: { content } }],
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns 8–10 shuffled valid words on a happy path', async () => {
    mockCreate.mockResolvedValueOnce(
      makeResponse('["LION","TIGER","BEAR","EAGLE","SHARK","WOLF","DEER","FROG","CROW","CRAB"]'),
    );
    const words = await service.generateWords('animals');
    expect(words.length).toBeGreaterThanOrEqual(8);
    expect(words.length).toBeLessThanOrEqual(10);
    for (const w of words) {
      expect(w).toMatch(/^[A-Z]{3,8}$/);
    }
  });

  it('normalises mixed-case words from the model', async () => {
    mockCreate.mockResolvedValueOnce(
      makeResponse('["lion","Tiger","BEAR","eagle","shark","wolf","deer","frog","crow","crab"]'),
    );
    const words = await service.generateWords('animals');
    expect(words).toEqual(expect.arrayContaining(['LION', 'TIGER', 'BEAR']));
  });

  it('filters out words with symbols, numbers, or wrong length', async () => {
    mockCreate.mockResolvedValueOnce(
      makeResponse('["LION","WO","TOOLONGWORD","BEAR-S","WORD1","EAGLE","SHARK","WOLF","DEER","FROG"]'),
    );
    const words = await service.generateWords('animals');
    expect(words).not.toContain('WO');
    expect(words).not.toContain('TOOLONGWORD');
    expect(words).not.toContain('BEAR-S');
    expect(words).not.toContain('WORD1');
  });

  it('deduplicates words before the length check', async () => {
    mockCreate.mockResolvedValueOnce(
      makeResponse('["LION","LION","BEAR","BEAR","EAGLE","EAGLE","SHARK","WOLF","DEER","FROG"]'),
    );
    const words = await service.generateWords('animals');
    const unique = new Set(words);
    expect(unique.size).toBe(words.length);
  });

  it('succeeds with exactly 6 valid words', async () => {
    mockCreate.mockResolvedValueOnce(
      makeResponse('["LION","BEAR","EAGLE","SHARK","WOLF","DEER"]'),
    );
    const words = await service.generateWords('animals');
    expect(words.length).toBe(6);
  });

  it('throws when fewer than 6 valid words remain after filtering', async () => {
    mockCreate.mockResolvedValueOnce(
      makeResponse('["LION","BEAR","EAGLE","SHARK","WOLF"]'),
    );
    await expect(service.generateWords('animals')).rejects.toThrow('animals');
  });

  it('throws when the model returns no JSON array', async () => {
    mockCreate.mockResolvedValueOnce(makeResponse('Sorry, I cannot help with that.'));
    await expect(service.generateWords('test')).rejects.toThrow();
  });

  it('throws when JSON is malformed', async () => {
    mockCreate.mockResolvedValueOnce(makeResponse('[LION, BEAR'));
    await expect(service.generateWords('test')).rejects.toThrow();
  });

  it('handles model response with prose before the JSON array', async () => {
    mockCreate.mockResolvedValueOnce(
      makeResponse('Here are 10 words: ["LION","TIGER","BEAR","EAGLE","SHARK","WOLF","DEER","FROG","CROW","CRAB"]'),
    );
    const words = await service.generateWords('animals');
    expect(words.length).toBeGreaterThanOrEqual(8);
  });

  it('propagates Groq SDK errors to the caller', async () => {
    mockCreate.mockRejectedValueOnce(new Error('Network error'));
    await expect(service.generateWords('animals')).rejects.toThrow('Network error');
  });
});
