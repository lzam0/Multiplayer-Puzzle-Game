import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { GameService } from './game.service';
import { TopicsService } from '../topics/topics.service';

@Controller('game')
export class GameController {
  constructor(
    private readonly gameService: GameService,
    private readonly topicsService: TopicsService,
  ) {}

  @Get('board')
  async getBoard(@Query('topic') topic: string) {
    if (!topic?.trim()) throw new BadRequestException('topic is required');
    const words = await this.topicsService.generateWords(topic);
    const board = this.gameService.generateGrid(words);
    return { board };
  }
}
