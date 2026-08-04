// Mirror of backend game.types.ts

export interface WordPath {
  word: string;
  indices: number[];  // flat cell indices, same encoding as trace_word
  color: string;      // hex from WORD_COLORS palette
}

export interface Topic {
  id: string;
  label: string;
  words: string[];
}

export interface Player {
  id: string;
  name: string;
  totalTimeMs: number;
  roundsCounted: number;
}

export interface LetterGrid {
  letters: string[][];
  words: string[];
  rows: number;
  cols: number;
}

export type GameStatus = 'waiting' | 'in_progress' | 'finished';

export interface RoomState {
  code: string;
  hostId: string;
  players: Player[];
  status: GameStatus;
  currentRound: null | {
    index: number;
    topicId: string;
    board: LetterGrid;
    phase: 'preview' | 'active' | 'ended';
    goLiveAt: number | null;
    endsAt: number | null;
  };
  roundNumber: number;
}

export interface PlayerRoundState {
  playerId: string;
  foundWords: string[];
  completedAt: number | null;
}

export interface RoundRankEntry {
  playerId: string;
  name: string;
  completionTimeMs: number | null;
  wordsFound: number;
  rank: number;
  chargedMs: number;
}

export interface PodiumEntry {
  playerId: string;
  name: string;
  totalTimeMs: number;
  rank: number;
}

export interface Score {
  id: string;
  name: string;
  score: number;
}

// Server → Client event payloads

export interface RoomJoinedPayload {
  room: RoomState;
}

export interface PlayerJoinedPayload {
  player: Player;
}

export interface PlayerLeftPayload {
  playerId: string;
}

export interface RoundStartingPayload {
  round: number;
  topic: string;
  board: LetterGrid;
  previewMs: number;
  totalRounds: number;
}

export interface RoundActivePayload {
  round: number;
  topic: string;
  board: LetterGrid;
  endsAt: number;
  durationMs: number;
}

export interface WordCorrectPayload {
  word: string;
  foundBy: string;
  score: number;
  remaining: number;
}

export interface WordIncorrectPayload {
  word: string;
  playerId: string;
}

export interface PlayerFinishedPayload {
  playerId: string;
  name: string;
  completionTimeMs: number;
}

export interface RoundOverPayload {
  rankings: RoundRankEntry[];
  roundIndex: number;
  isLastRound: boolean;
}

export interface GameOverPayload {
  scores: Score[];
  podium: PodiumEntry[];
}

export interface ErrorPayload {
  message: string;
}

// Client → Server event payloads

export interface JoinRoomPayload {
  code: string;
  playerName: string;
}

export interface StartGamePayload {
  code: string;
  topic: string;
}

export interface TraceWordPayload {
  code: string;
  word: string;
  letterIndices: number[];
}

export interface LeaveRoomPayload {
  code: string;
}

export interface ResetBoardPayload {
  code: string;
}

// Server → Client ack for reset_board
export interface BoardResetPayload {
  code: string;
}

// Client → Server
export interface KickPlayerPayload {
  code: string;
  playerId: string;
}

// Server → Client
export interface PlayerKickedPayload {
  playerId: string;
  name: string;
}
