// ---------------------------------------------------------------------------
// WEND core domain types
//
// Game model: Kahoot-style, multi-round, per-player timed word race.
// - Host previews the board for 5s, then it goes live on players' phones.
// - Each player solves their OWN board independently; found words are private.
// - A player's round time is measured server-side from board-go-live to finish.
// - Non-finishers are charged NON_FINISH_PENALTY_MS for the round.
// - Final ranking = LOWEST total time across all rounds.
// ---------------------------------------------------------------------------

/** A topic is a named word set used to build a board. Stored as static data. */
export interface Topic {
  id: string; // unique kebab-case id, e.g. "animals"
  label: string; // display name, e.g. "Animals"
  words: string[]; // ALL CAPS, 3-8 letters each
}

export interface Player {
  id: string; // socket ID assigned by Socket.io automatically
  name: string; // name they typed when joining
  totalTimeMs: number; // SUM of per-round times; LOWEST wins (replaces old word-count score)
  roundsCounted: number; // how many rounds contributed to totalTimeMs
}

export interface LetterGrid {
  letters: string[][]; // e.g. [['C','A','T'],['D','O','G']]
  words: string[]; // the hidden words players need to find (self-describing board)
  rows: number;
  cols: number;
}

/** Per-player, per-round progress. Each player has their own instance. */
export interface PlayerRoundState {
  playerId: string;
  foundWords: string[]; // this player's own found words this round
  completedAt: number | null; // ms from board-go-live to finish; null if not finished
}

/**
 * 'preview' = board shown on HOST screen only (5s); players have NOT received it.
 * 'active'  = board pushed to players' phones; their timers are running.
 * 'ended'   = round closed (all finished / timer expired / host ended early).
 */
export type RoundPhase = 'preview' | 'active' | 'ended';

export interface Round {
  index: number; // 0-based round number
  topicId: string;
  board: LetterGrid;
  phase: RoundPhase;
  goLiveAt: number | null; // epoch ms when the board hits players' phones; clocks start here
  endsAt: number | null; // epoch ms deadline (goLiveAt + ROUND_DURATION_MS)
  playerStates: Map<string, PlayerRoundState>;
}

export type GameStatus = 'waiting' | 'in_progress' | 'finished';

export interface Room {
  code: string;
  hostId: string; // socket ID of whoever created the room
  players: Player[];
  status: GameStatus;
  currentRound: Round | null; // replaces topic?/board?/foundWords
  roundNumber: number; // rounds started so far (0..MAX_ROUNDS)
}

/**
 * Per-round ranking entry.
 * Finishers are ranked by completionTimeMs asc, then non-finishers by wordsFound desc.
 */
export interface RoundRankEntry {
  playerId: string;
  name: string;
  completionTimeMs: number | null; // null = did not finish
  wordsFound: number;
  rank: number; // 1-based within this round
  chargedMs: number; // time added to the player's totalTimeMs for this round
}

/** Final podium entry, ranked by totalTimeMs ascending (lowest total wins). */
export interface PodiumEntry {
  playerId: string;
  name: string;
  totalTimeMs: number;
  rank: number;
}

/**
 * Legacy scoreboard shape kept for frontend `game_over` compatibility.
 * NOTE: `score` here carries totalTimeMs (lower is better) — see the podium event
 * for a cleaner, correctly-ordered representation.
 */
export interface Score {
  id: string;
  name: string;
  score: number;
}
