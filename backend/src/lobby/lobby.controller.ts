import {
  Controller,
  Post,
  Get,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { LobbyService } from './lobby.service';

@Controller('lobby')
export class LobbyController {
  constructor(private readonly lobbyService: LobbyService) {}

  @Post()
  createRoom() {
    const room = this.lobbyService.createRoom('pending');
    return { code: room.code };
  }

  @Get(':code')
  getRoom(@Param('code') code: string) {
    const room = this.lobbyService.getRoom(code);
    if (!room) throw new NotFoundException('Room not found');
    return {
      code: room.code,
      playerCount: room.players.length,
      status: room.status,
    };
  }
}
