import { Test, TestingModule } from '@nestjs/testing';
import { LobbyService } from './lobby.service';
import { LetterGrid } from '../game/game.types';
import { MAX_ROUNDS } from '../game/game.constants';

const board: LetterGrid = {
  letters: [['C', 'A', 'T']],
  words: ['CAT'],
  rows: 1,
  cols: 3,
};

function addCompetitor(
  svc: LobbyService,
  code: string,
  id: string,
  name: string,
) {
  svc.addPlayer(code, { id, name, totalTimeMs: 0, roundsCounted: 0 });
}

describe('LobbyService', () => {
  let service: LobbyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LobbyService],
    }).compile();
    service = module.get<LobbyService>(LobbyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('claimHost binds the room host to a live socket id (fixes the "pending" placeholder)', () => {
    const room = service.createRoom('pending');
    expect(room.hostId).toBe('pending');
    service.claimHost(room.code, 'host-socket-1');
    expect(service.getRoom(room.code)?.hostId).toBe('host-socket-1');
  });

  it('creates a room in the waiting state with no round', () => {
    const room = service.createRoom('host');
    expect(room.status).toBe('waiting');
    expect(room.currentRound).toBeNull();
    expect(room.roundNumber).toBe(0);
  });

  it('starts a round in preview and seeds per-competitor state (excludes host sentinel)', () => {
    const room = service.createRoom('host');
    service.addPlayer(room.code, {
      id: 'host',
      name: '__host__',
      totalTimeMs: 0,
      roundsCounted: 0,
    });
    addCompetitor(service, room.code, 'p1', 'Ann');

    const round = service.startRound(room.code, 'animals', board);
    expect(round?.phase).toBe('preview');
    expect(round?.playerStates.has('p1')).toBe(true);
    expect(round?.playerStates.has('host')).toBe(false);
    expect(service.getRoom(room.code)?.status).toBe('in_progress');
    expect(service.getRoom(room.code)?.roundNumber).toBe(1);
  });

  it('activates a round and records completion time', () => {
    const room = service.createRoom('host');
    addCompetitor(service, room.code, 'p1', 'Ann');
    service.startRound(room.code, 'animals', board);
    const endsAt = service.activateRound(room.code);
    expect(endsAt).not.toBeNull();

    const rec = service.recordFound(room.code, 'p1', 'CAT');
    expect(rec?.isComplete).toBe(true);
    expect(rec?.completionTimeMs).not.toBeNull();
    expect(service.allPlayersFinished(room.code)).toBe(true);
  });

  it('accumulates chargedMs into player totals on endRound', () => {
    const room = service.createRoom('host');
    addCompetitor(service, room.code, 'p1', 'Ann');
    service.startRound(room.code, 'animals', board);
    service.activateRound(room.code);

    service.endRound(room.code, [
      {
        playerId: 'p1',
        name: 'Ann',
        completionTimeMs: 21000,
        wordsFound: 1,
        rank: 1,
        chargedMs: 21000,
      },
    ]);

    const player = service
      .getRoom(room.code)
      ?.players.find((p) => p.id === 'p1');
    expect(player?.totalTimeMs).toBe(21000);
    expect(player?.roundsCounted).toBe(1);
    expect(service.getRoom(room.code)?.currentRound?.phase).toBe('ended');
  });

  it('enforces the round limit', () => {
    const room = service.createRoom('host');
    addCompetitor(service, room.code, 'p1', 'Ann');
    for (let i = 0; i < MAX_ROUNDS; i++) {
      service.startRound(room.code, 'animals', board);
    }
    expect(service.isRoundLimitReached(room.code)).toBe(true);
  });

  it('removing a player drops them from the active round', () => {
    const room = service.createRoom('host');
    addCompetitor(service, room.code, 'p1', 'Ann');
    service.startRound(room.code, 'animals', board);
    service.removePlayer(room.code, 'p1');
    expect(
      service.getRoom(room.code)?.currentRound?.playerStates.has('p1'),
    ).toBe(false);
  });

  describe('resetPlayerWords', () => {
    it('clears foundWords for an active-round player and returns true', () => {
      const room = service.createRoom('host');
      addCompetitor(service, room.code, 'p1', 'Ann');
      service.startRound(room.code, 'animals', board);
      service.activateRound(room.code);
      // Manually add a found word to simulate a prior trace.
      const state = service
        .getRoom(room.code)
        ?.currentRound?.playerStates.get('p1');
      expect(state).toBeDefined();
      state!.foundWords.push('CAT');
      expect(state!.foundWords).toHaveLength(1);

      const ok = service.resetPlayerWords(room.code, 'p1');
      expect(ok).toBe(true);
      expect(state!.foundWords).toHaveLength(0);
    });

    it('returns false and preserves state when player has already finished', () => {
      const room = service.createRoom('host');
      addCompetitor(service, room.code, 'p1', 'Ann');
      service.startRound(room.code, 'animals', board);
      service.activateRound(room.code);
      // Complete the board so completedAt is set.
      service.recordFound(room.code, 'p1', 'CAT');
      const state = service
        .getRoom(room.code)
        ?.currentRound?.playerStates.get('p1');
      expect(state?.completedAt).not.toBeNull();

      const ok = service.resetPlayerWords(room.code, 'p1');
      expect(ok).toBe(false);
      // foundWords still contains the word — state is unchanged.
      expect(state!.foundWords).toContain('CAT');
    });

    it('returns false when no active round exists (preview phase)', () => {
      const room = service.createRoom('host');
      addCompetitor(service, room.code, 'p1', 'Ann');
      // Round started but not activated (still in preview).
      service.startRound(room.code, 'animals', board);
      const ok = service.resetPlayerWords(room.code, 'p1');
      expect(ok).toBe(false);
    });

    it('returns false when no round exists at all', () => {
      const room = service.createRoom('host');
      addCompetitor(service, room.code, 'p1', 'Ann');
      const ok = service.resetPlayerWords(room.code, 'p1');
      expect(ok).toBe(false);
    });
  });
});
