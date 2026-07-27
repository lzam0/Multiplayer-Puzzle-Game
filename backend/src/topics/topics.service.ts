import { Injectable } from '@nestjs/common';
import Groq from 'groq-sdk';

@Injectable()
export class TopicsService {
  private readonly groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
    timeout: 5000,
    maxRetries: 1,
  });

  async generateWords(topic: string): Promise<string[]> {
    const prompt = `You are a word list generator for a word puzzle game.
Return ONLY a JSON array of 6 uppercase English words (3–8 letters each, single words only, no proper nouns) strongly associated with the topic: "${topic}".
Include a mix of word lengths — at least 2 words must be 3 or 4 letters long.
Example format: ["WORD","WORD","WORD"]`;

    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content ?? '';

    // Resilient parse: find first [...] block even if model adds prose
    const match = content.match(/\[.*?\]/s);
    if (!match) {
      throw new Error(`Not enough valid words for "${topic}". Try a different topic.`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      throw new Error(`Not enough valid words for "${topic}". Try a different topic.`);
    }

    if (!Array.isArray(parsed)) {
      throw new Error(`Not enough valid words for "${topic}". Try a different topic.`);
    }

    const valid = [
      ...new Set(
        (parsed as unknown[])
          .filter((w): w is string => typeof w === 'string')
          .map((w) => w.toUpperCase())
          .filter((w) => /^[A-Z]{3,8}$/.test(w)),
      ),
    ];

    if (valid.length < 4) {
      throw new Error(`Not enough valid words for "${topic}". Try a different topic.`);
    }

    const shuffled = valid.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(6, shuffled.length));
  }
}
