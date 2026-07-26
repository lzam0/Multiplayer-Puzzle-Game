import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { LobbyModule } from '../lobby/lobby.module';
import { GameModule } from '../game/game.module';
import { TopicsModule } from '../topics/topics.module';

@Module({
  imports: [LobbyModule, GameModule, TopicsModule],
  providers: [GameGateway],
})
export class GatewayModule {}
