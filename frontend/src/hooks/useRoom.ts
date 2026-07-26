'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from './useSocket';
import type {
  RoomState,
  LetterGrid,
  RoundRankEntry,
  PodiumEntry,
  WordPath,
  RoomJoinedPayload,
  PlayerJoinedPayload,
  PlayerLeftPayload,
  RoundStartingPayload,
  RoundActivePayload,
  WordCorrectPayload,
  WordIncorrectPayload,
  PlayerFinishedPayload,
  RoundOverPayload,
  GameOverPayload,
  ErrorPayload,
} from '@/lib/types';

export type FeedbackState = 'correct' | 'incorrect' | null;

const WORD_COLORS = [
  '#f87171', // red
  '#fb923c', // orange
  '#facc15', // yellow
  '#4ade80', // green
  '#34d399', // emerald
  '#60a5fa', // blue
  '#a78bfa', // violet
  '#f472b6', // pink
];

export type ClientPhase = 'lobby' | 'preview' | 'active' | 'round-result' | 'game-over';

interface UseRoomReturn {
  room: RoomState | null;
  phase: ClientPhase;
  feedback: FeedbackState;
  errorMsg: string | null;
  board: LetterGrid | null;
  topic: string | null;
  endsAt: number | null;
  roundIndex: number;
  totalRounds: number;
  isLastRound: boolean;
  foundWords: string[];
  foundWordPaths: WordPath[];
  playerFinished: boolean;
  finishers: PlayerFinishedPayload[];
  roundRankings: RoundRankEntry[];
  podium: PodiumEntry[];
  join: (name: string) => void;
  startGame: (topic: string) => void;
  nextRound: (topic: string) => void;
  endRound: () => void;
  endGame: () => void;
  traceWord: (word: string, letterIndices: number[]) => void;
  resetBoard: () => void;
  leave: () => void;
}

export function useRoom(code: string): UseRoomReturn {
  const { socket } = useSocket();
  const [room, setRoom] = useState<RoomState | null>(null);
  const [phase, setPhase] = useState<ClientPhase>('lobby');
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [board, setBoard] = useState<LetterGrid | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [roundIndex, setRoundIndex] = useState(0);
  const [totalRounds, setTotalRounds] = useState(3);
  const [isLastRound, setIsLastRound] = useState(false);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [foundWordPaths, setFoundWordPaths] = useState<WordPath[]>([]);
  const [playerFinished, setPlayerFinished] = useState(false);
  const [finishers, setFinishers] = useState<PlayerFinishedPayload[]>([]);
  const [roundRankings, setRoundRankings] = useState<RoundRankEntry[]>([]);
  const [podium, setPodium] = useState<PodiumEntry[]>([]);

  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTraceRef = useRef<{ word: string; letterIndices: number[] } | null>(null);
  const boardRef = useRef<LetterGrid | null>(null);

  useEffect(() => {
    if (!errorMsg) return;
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setErrorMsg(null), 4500);
    return () => {
      if (errorTimer.current) clearTimeout(errorTimer.current);
    };
  }, [errorMsg]);

  const clearFeedback = useCallback(() => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 2000);
  }, []);

  useEffect(() => {
    const onRoomJoined = (payload: RoomJoinedPayload) => {
      setRoom(payload.room);
    };

    const onPlayerJoined = (payload: PlayerJoinedPayload) => {
      setRoom((prev) => {
        if (!prev) return prev;
        const already = prev.players.some((p) => p.id === payload.player.id);
        if (already) return prev;
        return { ...prev, players: [...prev.players, payload.player] };
      });
    };

    const onPlayerLeft = (payload: PlayerLeftPayload) => {
      setRoom((prev) => {
        if (!prev) return prev;
        return { ...prev, players: prev.players.filter((p) => p.id !== payload.playerId) };
      });
    };

    // Host only: 5s board preview before players get the board
    const onRoundStarting = (payload: RoundStartingPayload) => {
      boardRef.current = payload.board;
      setBoard(payload.board);
      setTopic(payload.topic);
      setRoundIndex(payload.round);
      setTotalRounds(payload.totalRounds);
      setFoundWords([]);
      setFoundWordPaths([]);
      setPlayerFinished(false);
      setFinishers([]);
      setPhase('preview');
    };

    // All clients: board goes live, player clocks start
    const onRoundActive = (payload: RoundActivePayload) => {
      boardRef.current = payload.board;
      setBoard(payload.board);
      setTopic(payload.topic);
      setEndsAt(payload.endsAt);
      setRoundIndex(payload.round);
      setFoundWords([]);
      setFoundWordPaths([]);
      setPlayerFinished(false);
      setFinishers([]);
      setPhase('active');
    };

    // Submitter only: private word found
    const onWordCorrect = (payload: WordCorrectPayload) => {
      if (payload.foundBy !== socket.id) return;
      if (pendingTraceRef.current?.word === payload.word) {
        const indices = pendingTraceRef.current.letterIndices;
        const word = payload.word;
        setFoundWordPaths((prev) => {
          const colorIndex = boardRef.current ? boardRef.current.words.indexOf(word) : 0;
          const color = WORD_COLORS[colorIndex % WORD_COLORS.length] ?? WORD_COLORS[0];
          return [...prev, { word, indices, color }];
        });
        pendingTraceRef.current = null;
      }
      setFoundWords((prev) => [...prev, payload.word]);
      setFeedback('correct');
      clearFeedback();
    };

    // Submitter only: rejected trace
    const onWordIncorrect = (payload: WordIncorrectPayload) => {
      if (payload.playerId !== socket.id) return;
      setFeedback('incorrect');
      clearFeedback();
    };

    // Host + finishing player: a player completed their board
    const onPlayerFinished = (payload: PlayerFinishedPayload) => {
      if (payload.playerId === socket.id) {
        setPlayerFinished(true);
      }
      setFinishers((prev) => {
        if (prev.some((f) => f.playerId === payload.playerId)) return prev;
        return [...prev, payload];
      });
    };

    const onRoundOver = (payload: RoundOverPayload) => {
      setRoundRankings(payload.rankings);
      setIsLastRound(payload.isLastRound);
      setPhase('round-result');
    };

    const onGameOver = (payload: GameOverPayload) => {
      setPodium(payload.podium);
      setPhase('game-over');
    };

    const onError = (payload: ErrorPayload) => {
      setErrorMsg(payload.message);
    };

    socket.on('room_joined', onRoomJoined);
    socket.on('player_joined', onPlayerJoined);
    socket.on('player_left', onPlayerLeft);
    socket.on('round_starting', onRoundStarting);
    socket.on('round_active', onRoundActive);
    socket.on('word_correct', onWordCorrect);
    socket.on('word_incorrect', onWordIncorrect);
    socket.on('player_finished', onPlayerFinished);
    socket.on('round_over', onRoundOver);
    socket.on('game_over', onGameOver);
    socket.on('error', onError);

    return () => {
      socket.off('room_joined', onRoomJoined);
      socket.off('player_joined', onPlayerJoined);
      socket.off('player_left', onPlayerLeft);
      socket.off('round_starting', onRoundStarting);
      socket.off('round_active', onRoundActive);
      socket.off('word_correct', onWordCorrect);
      socket.off('word_incorrect', onWordIncorrect);
      socket.off('player_finished', onPlayerFinished);
      socket.off('round_over', onRoundOver);
      socket.off('game_over', onGameOver);
      socket.off('error', onError);
    };
  }, [socket, clearFeedback]);

  const join = useCallback(
    (name: string) => socket.emit('join_room', { code, playerName: name }),
    [socket, code],
  );

  const startGame = useCallback(
    (topic: string) => socket.emit('start_game', { code, topic }),
    [socket, code],
  );

  const nextRound = useCallback(
    (topic: string) => socket.emit('next_round', { code, topic }),
    [socket, code],
  );

  const endRound = useCallback(
    () => socket.emit('end_round', { code }),
    [socket, code],
  );

  const endGame = useCallback(
    () => socket.emit('end_game', { code }),
    [socket, code],
  );

  const traceWord = useCallback(
    (word: string, letterIndices: number[]) => {
      pendingTraceRef.current = { word, letterIndices };
      socket.emit('trace_word', { code, word, letterIndices });
    },
    [socket, code],
  );

  const resetBoard = useCallback(
    () => setFoundWordPaths([]),
    [],
  );

  const leave = useCallback(
    () => socket.emit('leave_room', { code }),
    [socket, code],
  );

  return {
    room,
    phase,
    feedback,
    errorMsg,
    board,
    topic,
    endsAt,
    roundIndex,
    totalRounds,
    isLastRound,
    foundWords,
    foundWordPaths,
    playerFinished,
    finishers,
    roundRankings,
    podium,
    join,
    startGame,
    nextRound,
    endRound,
    endGame,
    traceWord,
    resetBoard,
    leave,
  };
}
