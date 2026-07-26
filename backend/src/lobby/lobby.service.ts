import { Injectable } from '@nestjs/common';
import {
  Room,
  Player,
  LetterGrid,
  Round,
  PlayerRoundState,
  RoundRankEntry,
} from '../game/game.types';
import { ROUND_DURATION_MS, MAX_ROUNDS } from '../game/game.constants';

const HOST_SENTINEL = '__host__';

@Injectable()
export class LobbyService {
  private rooms = new Map<string, Room>();

  private generateCode(): string {
    let code: string;
    do {
      code = Math.floor(1000 + Math.random() * 9000).toString();
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(hostId: string): Room {
    const code = this.generateCode();
    const room: Room = {
      code,
      hostId,
      players: [],
      status: 'waiting',
      currentRound: null,
      roundNumber: 0,
    };
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  addPlayer(code: string, player: Player): boolean {
    const room = this.rooms.get(code);
    if (!room) return false;
    room.players.push(player);
    return true;
  }

  /**
   * Bind a room's host to a live socket id. The REST createRoom sets a 'pending'
   * placeholder because the host's socket does not exist yet; the host's browser
   * then joins over WebSocket as the sentinel, at which point we claim it here.
   */
  claimHost(code: string, hostSocketId: string): void {
    const room = this.rooms.get(code);
    if (room) room.hostId = hostSocketId;
  }

  removePlayer(code: string, playerId: string): void {
    const room = this.rooms.get(code);
    if (!room) return;
    room.players = room.players.filter((p) => p.id !== playerId);
    // Drop them from any in-flight round too.
    room.currentRound?.playerStates.delete(playerId);
  }

  findRoomByPlayerId(playerId: string): Room | undefined {
    return [...this.rooms.values()].find((room) =>
      room.players.some((p) => p.id === playerId),
    );
  }

  // ---------------------------------------------------------------------------
  // Round lifecycle
  // ---------------------------------------------------------------------------

  /** Non-host players only (the host joins as HOST_SENTINEL and never competes). */
  private competingPlayers(room: Room): Player[] {
    return room.players.filter((p) => p.name !== HOST_SENTINEL);
  }

  /** True once all MAX_ROUNDS have been started. */
  isRoundLimitReached(code: string): boolean {
    const room = this.rooms.get(code);
    if (!room) return true;
    return room.roundNumber >= MAX_ROUNDS;
  }

  /**
   * Create a new round in the 'preview' phase (board exists but players have NOT
   * received it yet). Initializes a per-player round state for each competitor.
   */
  startRound(code: string, topicId: string, board: LetterGrid): Round | null {
    const room = this.rooms.get(code);
    if (!room) return null;

    const playerStates = new Map<string, PlayerRoundState>();
    for (const p of this.competingPlayers(room)) {
      playerStates.set(p.id, {
        playerId: p.id,
        foundWords: [],
        completedAt: null,
      });
    }

    const round: Round = {
      index: room.roundNumber,
      topicId,
      board,
      phase: 'preview',
      goLiveAt: null,
      endsAt: null,
      playerStates,
    };
    room.currentRound = round;
    room.roundNumber += 1;
    room.status = 'in_progress';
    return round;
  }

  /**
   * Transition the current round to 'active': board goes live on phones and each
   * player's clock starts now. Returns the endsAt deadline (epoch ms) or null.
   */
  activateRound(code: string): number | null {
    const room = this.rooms.get(code);
    const round = room?.currentRound;
    if (!round) return null;
    const now = Date.now();
    round.phase = 'active';
    round.goLiveAt = now;
    round.endsAt = now + ROUND_DURATION_MS;
    return round.endsAt;
  }

  /**
   * Record a found word for a player. If it completes their board, stamp their
   * completion time (ms since go-live).
   */
  recordFound(
    code: string,
    playerId: string,
    word: string,
  ): {
    isComplete: boolean;
    wordsFound: number;
    total: number;
    completionTimeMs: number | null;
  } | null {
    const room = this.rooms.get(code);
    const round = room?.currentRound;
    if (!round) return null;
    const state = round.playerStates.get(playerId);
    if (!state) return null;

    if (!state.foundWords.includes(word)) {
      state.foundWords.push(word);
    }

    const total = round.board.words.length;
    const wordsFound = state.foundWords.length;
    const isComplete = wordsFound >= total;

    if (isComplete && state.completedAt === null) {
      const goLive = round.goLiveAt ?? Date.now();
      state.completedAt = Date.now() - goLive;
    }

    return {
      isComplete,
      wordsFound,
      total,
      completionTimeMs: state.completedAt,
    };
  }

  /** True when every competitor has a completion time this round. */
  allPlayersFinished(code: string): boolean {
    const room = this.rooms.get(code);
    const round = room?.currentRound;
    if (!round) return false;
    if (round.playerStates.size === 0) return false;
    return [...round.playerStates.values()].every(
      (s) => s.completedAt !== null,
    );
  }

  /**
   * Close the round and accumulate each entry's chargedMs into the player's
   * running total. Returns the (now 'ended') round, or null.
   */
  endRound(code: string, rankEntries: RoundRankEntry[]): Round | null {
    const room = this.rooms.get(code);
    const round = room?.currentRound;
    if (!round) return null;
    round.phase = 'ended';
    for (const entry of rankEntries) {
      const player = room.players.find((p) => p.id === entry.playerId);
      if (player) {
        player.totalTimeMs += entry.chargedMs;
        player.roundsCounted += 1;
      }
    }
    return round;
  }

  setStatus(code: string, status: Room['status']): void {
    const room = this.rooms.get(code);
    if (room) room.status = status;
  }
}
