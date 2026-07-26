import { Injectable } from '@nestjs/common';
import { Topic } from '../game/game.types';
import { TOPICS } from './topics.data';

@Injectable()
export class TopicsService {
  private readonly topics: Topic[] = TOPICS;

  /** All available topics. */
  getTopics(): Topic[] {
    return this.topics;
  }

  /** Exact id match. */
  getTopicById(id: string): Topic | undefined {
    return this.topics.find((t) => t.id === id);
  }

  /**
   * Resolve a topic by id first, then by case-insensitive label.
   * The frontend currently sends the display label (e.g. "Animals"), so the
   * label fallback lets it work without any frontend change.
   */
  resolveTopic(idOrLabel: string): Topic | undefined {
    if (!idOrLabel) return undefined;
    const byId = this.getTopicById(idOrLabel);
    if (byId) return byId;
    const needle = idOrLabel.toLowerCase();
    return this.topics.find((t) => t.label.toLowerCase() === needle);
  }

  /** Words for a topic resolved by id or label, or undefined if unresolved. */
  getWords(idOrLabel: string): string[] | undefined {
    return this.resolveTopic(idOrLabel)?.words;
  }
}
