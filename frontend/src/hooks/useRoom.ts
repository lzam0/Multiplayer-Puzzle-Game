'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from './useSocket';
import type {
  RoomState,
  Score,
  RoomJoinedPayload,
  PlayerJoinedPayload,
  PlayerLeftPayload,
  GameStartedPayload,
  WordCorrectPayload,
  WordIncorrectPayload,
  GameOverPayload,
  ErrorPayload,
} from '@/lib/types';

export type FeedbackState = 'correct' | 'incorrect' | null;

interface UseRoomReturn {
  room: RoomState | null;
  feedback: FeedbackState;
  scores: Score[];
  errorMsg: string | null;
  join: (name: string) => void;
  startGame: (topic: string) => void;
  traceWord: (word: string, letterIndices: number[]) => void;
  leave: () => void;
}

export function useRoom(code: string, myName: string | null): UseRoomReturn {
  const { socket } = useSocket();
  const [room, setRoom] = useState<RoomState | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!errorMsg) return;
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setErrorMsg(null), 4500);
    return () => {
      if (errorTimer.current) clearTimeout(errorTimer.current);
    };
  }, [errorMsg]);

  const clearFeedback = useCallback(() => {
    if (feedbackTimer.current) {
      clearTimeout(feedbackTimer.current);
    }
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
        return {
          ...prev,
          players: prev.players.filter((p) => p.id !== payload.playerId),
        };
      });
    };

    const onGameStarted = (payload: GameStartedPayload) => {
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: 'in_progress',
          topic: payload.topic,
          board: undefined,
        };
      });
    };

    const onWordCorrect = (payload: WordCorrectPayload) => {
      setRoom((prev) => {
        if (!prev) return prev;
        const updatedPlayers = prev.players.map((p) =>
          p.id === payload.foundBy ? { ...p, score: payload.score } : p,
        );
        return {
          ...prev,
          players: updatedPlayers,
          foundWords: [...prev.foundWords, payload.word],
        };
      });
      if (myName !== null) {
        const myId = socket.id;
        if (payload.foundBy === myId) {
          setFeedback('correct');
          clearFeedback();
        }
      }
    };

    const onWordIncorrect = (payload: WordIncorrectPayload) => {
      if (payload.playerId === socket.id) {
        setFeedback('incorrect');
        clearFeedback();
      }
    };

    const onGameOver = (payload: GameOverPayload) => {
      setScores(payload.scores);
      setRoom((prev) => {
        if (!prev) return prev;
        return { ...prev, status: 'finished' };
      });
    };

    const onError = (payload: ErrorPayload) => {
      setErrorMsg(payload.message);
    };

    socket.on('room_joined', onRoomJoined);
    socket.on('player_joined', onPlayerJoined);
    socket.on('player_left', onPlayerLeft);
    socket.on('game_started', onGameStarted);
    socket.on('word_correct', onWordCorrect);
    socket.on('word_incorrect', onWordIncorrect);
    socket.on('game_over', onGameOver);
    socket.on('error', onError);

    return () => {
      socket.off('room_joined', onRoomJoined);
      socket.off('player_joined', onPlayerJoined);
      socket.off('player_left', onPlayerLeft);
      socket.off('game_started', onGameStarted);
      socket.off('word_correct', onWordCorrect);
      socket.off('word_incorrect', onWordIncorrect);
      socket.off('game_over', onGameOver);
      socket.off('error', onError);
    };
  }, [socket, myName, clearFeedback]);

  const join = useCallback(
    (name: string) => {
      socket.emit('join_room', { code, playerName: name });
    },
    [socket, code],
  );

  const startGame = useCallback(
    (topic: string) => {
      socket.emit('start_game', { code, topic });
    },
    [socket, code],
  );

  const traceWord = useCallback(
    (word: string, letterIndices: number[]) => {
      socket.emit('trace_word', { code, word, letterIndices });
    },
    [socket, code],
  );

  const leave = useCallback(() => {
    socket.emit('leave_room', { code });
  }, [socket, code]);

  return { room, feedback, scores, errorMsg, join, startGame, traceWord, leave };
}
