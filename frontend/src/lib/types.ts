// Mirror of backend game.types.ts

export interface Player {
  id: string;
  name: string;
  score: number;
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
  topic?: string;
  board?: LetterGrid;
  foundWords: string[];
}

// Score shape for game_over event
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

export interface GameStartedPayload {
  topic: string;
}

export interface WordCorrectPayload {
  word: string;
  foundBy: string;
  score: number;
}

export interface WordIncorrectPayload {
  word: string;
  playerId: string;
}

export interface GameOverPayload {
  scores: Score[];
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
