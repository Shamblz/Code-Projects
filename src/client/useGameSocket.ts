'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from './socketSingleton';
import { forgetIdentity, getIdentity, rememberIdentity } from './storage';
import type { Action, Game } from '../game/types';

type Ack<T> = ({ ok: true } & T) | { ok: false; error: string };

export interface UseGameSocketResult {
  game: Game | null;
  playerId: string | null;
  connected: boolean;
  error: string | null;
  lastAction: Action | null;
  lastWinnings: Array<{ playerId: string; amount: number }> | null;
  joinState: 'idle' | 'joining' | 'joined' | 'needs-name' | 'not-found';
  joinAsNew: (name: string) => Promise<void>;
  clearLastAction: () => void;
  clearLastWinnings: () => void;
  clearError: () => void;
  emit: <T = unknown>(event: string, payload?: unknown) => Promise<Ack<T>>;
}

export function useGameSocket(code: string | null): UseGameSocketResult {
  const [game, setGame] = useState<Game | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<Action | null>(null);
  const [lastWinnings, setLastWinnings] = useState<UseGameSocketResult['lastWinnings']>(null);
  const [joinState, setJoinState] = useState<UseGameSocketResult['joinState']>('idle');
  const joinedRef = useRef<string | null>(null);

  const emit = useCallback(<T,>(event: string, payload?: unknown): Promise<Ack<T>> => {
    return new Promise((resolve) => {
      const socket = getSocket();
      const cb = (ack: Ack<T>) => resolve(ack ?? ({ ok: true } as { ok: true } & T));
      if (payload === undefined) socket.emit(event, cb);
      else socket.emit(event, payload, cb);
    });
  }, []);

  const attemptRejoin = useCallback(async (gameCode: string) => {
    const stored = getIdentity(gameCode);
    if (!stored) {
      setJoinState('needs-name');
      return;
    }
    setJoinState('joining');
    const ack = await emit<{ code: string; playerId: string; game: Game }>('game:join', {
      code: gameCode,
      playerId: stored.playerId,
      name: stored.name,
    });
    if (ack.ok) {
      setGame(ack.game);
      setPlayerId(ack.playerId);
      joinedRef.current = gameCode;
      setJoinState('joined');
    } else {
      forgetIdentity(gameCode);
      if (ack.error === 'Game not found') setJoinState('not-found');
      else setJoinState('needs-name');
    }
  }, [emit]);

  const joinAsNew = useCallback(async (name: string) => {
    if (!code) return;
    setJoinState('joining');
    const ack = await emit<{ code: string; playerId: string; game: Game }>('game:join', {
      code,
      name,
    });
    if (ack.ok) {
      setGame(ack.game);
      setPlayerId(ack.playerId);
      rememberIdentity(ack.code, ack.playerId, name);
      joinedRef.current = ack.code;
      setJoinState('joined');
    } else {
      setError(ack.error);
      setJoinState(ack.error === 'Game not found' ? 'not-found' : 'needs-name');
    }
  }, [code, emit]);

  useEffect(() => {
    const socket = getSocket();
    const onConnect = () => {
      setConnected(true);
      if (code && joinedRef.current !== code) attemptRejoin(code);
    };
    const onDisconnect = () => setConnected(false);
    const onState = ({ game: g }: { game: Game }) => setGame(g);
    const onAction = ({ action }: { action: Action }) => setLastAction(action);
    const onHandEnded = ({ winnings }: { winnings: UseGameSocketResult['lastWinnings'] }) =>
      setLastWinnings(winnings);
    const onError = (e: { code: string; message: string }) => setError(e.message);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('state:update', onState);
    socket.on('action:logged', onAction);
    socket.on('hand:ended', onHandEnded);
    socket.on('error', onError);

    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('state:update', onState);
      socket.off('action:logged', onAction);
      socket.off('hand:ended', onHandEnded);
      socket.off('error', onError);
    };
  }, [code, attemptRejoin]);

  return {
    game, playerId, connected, error, lastAction, lastWinnings, joinState,
    joinAsNew,
    clearLastAction: () => setLastAction(null),
    clearLastWinnings: () => setLastWinnings(null),
    clearError: () => setError(null),
    emit,
  };
}
