import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LobbyModule } from './lobby/lobby.module';
import { GameModule } from './game/game.module';
import { GatewayModule } from './gateway/gateway.module';
import { TopicsModule } from './topics/topics.module';

@Module({
  imports: [LobbyModule, GameModule, GatewayModule, TopicsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
