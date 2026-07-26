import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LobbyService } from '../lobby/lobby.service';
import { GameService } from '../game/game.service';
import { TopicsService } from '../topics/topics.service';
import { Score, PodiumEntry, LetterGrid } from '../game/game.types';
import {
  PREVIEW_MS,
  ROUND_DURATION_MS,
  MAX_ROUNDS,
  MAX_TRACE_PER_SEC,
} from '../game/game.constants';

const HOST_SENTINEL = '__host__';

@WebSocketGateway({ cors: { origin: '*' } })
export class GameGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Server-side round timers keyed by room code (preview -> active, active -> end).
  private previewTimers = new Map<string, NodeJS.Timeout>();
  private roundTimers = new Map<string, NodeJS.Timeout>();
  // Per-socket trace_word rate limiting: recent submission timestamps.
  private traceHits = new Map<string, number[]>();

  constructor(
    private readonly lobbyService: LobbyService,
    private readonly gameService: GameService,
    private readonly topicsService: TopicsService,
  ) {}

  @SubscribeMessage('join_room')
  handleJoinRoom(
    @MessageBody() data: { code: string; playerName: string },
    @ConnectedSocket() client: Socket,
  ) {
    const player = {
      id: client.id,
      name: data.playerName,
      totalTimeMs: 0,
      roundsCounted: 0,
    };
    const success = this.lobbyService.addPlayer(data.code, player);

    if (!success) {
      client.emit('error', { message: 'Room not found' });
      return;
    }

    // The host browser joins as the sentinel; bind the room's host to its socket.
    if (data.playerName === HOST_SENTINEL) {
      this.lobbyService.claimHost(data.code, client.id);
    }

    client.join(data.code);
    const room = this.lobbyService.getRoom(data.code);
    client.emit('room_joined', { room });
    client.to(data.code).emit('player_joined', { player });
  }

  @SubscribeMessage('start_game')
  async handleStartGame(
    @MessageBody() data: { code: string; topic: string },
    @ConnectedSocket() client: Socket,
  ) {
    await this.beginRound(data.code, data.topic, client);
  }

  @SubscribeMessage('next_round')
  async handleNextRound(
    @MessageBody() data: { code: string; topic: string },
    @ConnectedSocket() client: Socket,
  ) {
    await this.beginRound(data.code, data.topic, client);
  }

  /** Shared round-start path for both start_game and next_round. */
  private async beginRound(code: string, topic: string, client: Socket) {
    const room = this.lobbyService.getRoom(code);
    if (!room || room.hostId !== client.id) {
      client.emit('error', { message: 'Only the host can start a round' });
      return;
    }
    if (this.lobbyService.isRoundLimitReached(code)) {
      client.emit('error', { message: 'All rounds have been played' });
      return;
    }

    let words: string[];
    try {
      words = await this.topicsService.generateWords(topic);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not generate words for this topic';
      client.emit('error', { message });
      return;
    }

    let board: LetterGrid;
    try {
      board = this.gameService.generateGrid(words);
    } catch {
      client.emit('error', { message: 'Could not generate a board' });
      return;
    }

    const round = this.lobbyService.startRound(code, topic, board);
    if (!round) {
      client.emit('error', { message: 'Could not start the round' });
      return;
    }

    // Host-only 5s preview. Players receive nothing yet (cannot pre-solve).
    client.emit('round_starting', {
      round: round.index,
      topic,
      board,
      previewMs: PREVIEW_MS,
      totalRounds: MAX_ROUNDS,
    });

    this.clearTimers(code);
    this.previewTimers.set(
      code,
      setTimeout(() => {
        this.previewTimers.delete(code);
        const endsAt = this.lobbyService.activateRound(code);
        if (endsAt == null) return;

        // Board goes live on players' phones; their clocks start now.
        this.server.to(code).emit('round_active', {
          round: round.index,
          topic,
          board,
          endsAt,
          durationMs: ROUND_DURATION_MS,
        });

        this.roundTimers.set(
          code,
          setTimeout(() => {
            this.roundTimers.delete(code);
            this.finishRound(code);
          }, ROUND_DURATION_MS),
        );
      }, PREVIEW_MS),
    );
  }

  @SubscribeMessage('trace_word')
  handleTraceWord(
    @MessageBody()
    data: { code: string; word: string; letterIndices: number[] },
    @ConnectedSocket() client: Socket,
  ) {
    if (this.isRateLimited(client.id)) return;

    const room = this.lobbyService.getRoom(data.code);
    const round = room?.currentRound;
    if (!room || !round || round.phase !== 'active') return;
    if (!room.players.some((p) => p.id === client.id)) return;

    const state = round.playerStates.get(client.id);
    if (!state) return;

    const result = this.gameService.validateTrace(
      round.board,
      state.foundWords,
      data.word,
      data.letterIndices,
    );

    if (result === 'incorrect') {
      client.emit('word_incorrect', {
        word: data.word,
        playerId: client.id,
      });
      return;
    }

    const upper = data.word.toUpperCase();
    const rec = this.lobbyService.recordFound(data.code, client.id, upper);
    if (!rec) return;

    // Sent to the submitter ONLY — boards are independent.
    client.emit('word_correct', {
      word: upper,
      foundBy: client.id,
      score: rec.wordsFound,
      remaining: rec.total - rec.wordsFound,
    });

    if (rec.isComplete) {
      const player = room.players.find((p) => p.id === client.id);
      const payload = {
        playerId: client.id,
        name: player?.name ?? '?',
        completionTimeMs: rec.completionTimeMs,
      };
      // Notify the finishing player and the host display.
      client.emit('player_finished', payload);
      this.server.to(room.hostId).emit('player_finished', payload);

      if (this.lobbyService.allPlayersFinished(data.code)) {
        this.finishRound(data.code);
      }
    }
  }

  @SubscribeMessage('end_round')
  handleEndRound(
    @MessageBody() data: { code: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = this.lobbyService.getRoom(data.code);
    if (!room || room.hostId !== client.id) {
      client.emit('error', { message: 'Only the host can end a round' });
      return;
    }
    this.finishRound(data.code);
  }

  @SubscribeMessage('end_game')
  handleEndGame(
    @MessageBody() data: { code: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = this.lobbyService.getRoom(data.code);
    if (!room || room.hostId !== client.id) {
      client.emit('error', { message: 'Only the host can end the game' });
      return;
    }
    this.clearTimers(data.code);
    this.lobbyService.setStatus(data.code, 'finished');

    const competitors = room.players.filter((p) => p.name !== HOST_SENTINEL);
    const sorted = [...competitors].sort(
      (a, b) => a.totalTimeMs - b.totalTimeMs,
    );
    const podium: PodiumEntry[] = sorted.map((p, i) => ({
      playerId: p.id,
      name: p.name,
      totalTimeMs: p.totalTimeMs,
      rank: i + 1,
    }));
    // Legacy shape: score carries totalTimeMs (lower is better).
    const scores: Score[] = sorted.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.totalTimeMs,
    }));

    this.server.to(data.code).emit('game_over', { scores, podium });
  }

  /** Close the current round: rank, accumulate totals, broadcast round_over. */
  private finishRound(code: string) {
    this.clearTimers(code);
    const room = this.lobbyService.getRoom(code);
    const round = room?.currentRound;
    if (!room || !round || round.phase === 'ended') return;

    const rankings = this.gameService.rankRound(round, room.players);
    this.lobbyService.endRound(code, rankings);

    this.server.to(code).emit('round_over', {
      rankings,
      roundIndex: round.index,
      isLastRound: this.lobbyService.isRoundLimitReached(code),
    });
  }

  private clearTimers(code: string) {
    const pt = this.previewTimers.get(code);
    if (pt) {
      clearTimeout(pt);
      this.previewTimers.delete(code);
    }
    const rt = this.roundTimers.get(code);
    if (rt) {
      clearTimeout(rt);
      this.roundTimers.delete(code);
    }
  }

  private isRateLimited(socketId: string): boolean {
    const now = Date.now();
    const hits = (this.traceHits.get(socketId) ?? []).filter(
      (t) => now - t < 1000,
    );
    if (hits.length >= MAX_TRACE_PER_SEC) {
      this.traceHits.set(socketId, hits);
      return true;
    }
    hits.push(now);
    this.traceHits.set(socketId, hits);
    return false;
  }

  handleDisconnect(client: Socket) {
    this.traceHits.delete(client.id);
    const room = this.lobbyService.findRoomByPlayerId(client.id);
    if (!room) return;
    this.lobbyService.removePlayer(room.code, client.id);
    this.server.to(room.code).emit('player_left', { playerId: client.id });
  }
}
