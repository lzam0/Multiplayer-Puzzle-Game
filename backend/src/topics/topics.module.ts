import { Module } from '@nestjs/common';
import { TopicsService } from './topics.service';

@Module({
  providers: [TopicsService],
  exports: [TopicsService],
})
export class TopicsModule {}
