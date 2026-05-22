import type { Server as IOServer, Socket } from 'socket.io';
import {
  addPlayer,
  allIn,
  call,
  check,
  createGame,
  declareWinners,
  EngineError,
  fold,
  raise,
  rebuy,
  removePlayer,
  setConnected,
  startHand,
} from '../game/engine';
import type { Game } from '../game/types';
import { generateGameCode, generatePlayerId } from './codes';
import { getGame, listCodes, saveGame, withGameLock } from './store';

interface SocketData {
  gameCode?: string;
  playerId?: string;
}

function room(code: string) {
  return `game:${code}`;
}

function broadcast(io: IOServer, game: Game) {
  io.to(room(game.code)).emit('state:update', { game });
}

function broadcastLastAction(io: IOServer, game: Game) {
  const last = game.hand?.actions[game.hand.actions.length - 1] ?? game.history[game.history.length - 1];
  if (last) io.to(room(game.code)).emit('action:logged', { action: last });
}

function sendError(socket: Socket, code: string, message: string) {
  socket.emit('error', { code, message });
}

function isHost(game: Game, playerId: string | undefined): boolean {
  return Boolean(playerId) && game.hostId === playerId;
}

export function attachSocketHandlers(io: IOServer) {
  io.on('connection', (socket: Socket) => {
    const data = socket.data as SocketData;

    socket.on('game:create', async (payload, ack) => {
      try {
        const { hostName, startingStack, smallBlind, bigBlind } = payload ?? {};
        if (typeof hostName !== 'string' || !hostName.trim()) {
          return ack?.({ ok: false, error: 'Host name is required' });
        }
        const stack = Number(startingStack);
        const sb = Number(smallBlind);
        const bb = Number(bigBlind);
        const code = generateGameCode(listCodes());
        const hostId = generatePlayerId();
        const game = createGame(code, hostId, hostName.trim(), stack, sb, bb);
        saveGame(game);
        data.gameCode = code;
        data.playerId = hostId;
        socket.join(room(code));
        ack?.({ ok: true, code, playerId: hostId, game });
      } catch (err) {
        const msg = err instanceof EngineError ? err.message : 'Failed to create game';
        ack?.({ ok: false, error: msg });
      }
    });

    socket.on('game:join', async (payload, ack) => {
      try {
        const { code, name, playerId } = payload ?? {};
        if (typeof code !== 'string' || !code) {
          return ack?.({ ok: false, error: 'Game code required' });
        }
        const normalizedCode = code.toUpperCase();
        const game = getGame(normalizedCode);
        if (!game) return ack?.({ ok: false, error: 'Game not found' });

        await withGameLock(normalizedCode, () => {
          if (playerId && game.players.find((p) => p.id === playerId)) {
            setConnected(game, playerId, true);
            data.playerId = playerId;
          } else {
            if (typeof name !== 'string' || !name.trim()) {
              throw new EngineError('name_required', 'Player name is required');
            }
            const newId = generatePlayerId();
            addPlayer(game, newId, name.trim());
            data.playerId = newId;
          }
        });
        data.gameCode = normalizedCode;
        socket.join(room(normalizedCode));
        ack?.({ ok: true, code: normalizedCode, playerId: data.playerId, game });
        broadcast(io, game);
      } catch (err) {
        const msg = err instanceof EngineError ? err.message : 'Failed to join game';
        ack?.({ ok: false, error: msg });
      }
    });

    socket.on('game:requestState', async (ack) => {
      if (!data.gameCode) return ack?.({ ok: false, error: 'Not in a game' });
      const game = getGame(data.gameCode);
      if (!game) return ack?.({ ok: false, error: 'Game not found' });
      ack?.({ ok: true, game });
    });

    socket.on('host:startHand', async () => {
      await mutate(socket, io, (game) => {
        if (!isHost(game, data.playerId)) {
          throw new EngineError('not_host', 'Only the host can start a hand');
        }
        startHand(game);
      });
    });

    socket.on('host:rebuy', async (payload) => {
      const { playerId, amount } = payload ?? {};
      await mutate(socket, io, (game) => {
        if (!isHost(game, data.playerId)) {
          throw new EngineError('not_host', 'Only the host can issue rebuys');
        }
        rebuy(game, playerId, Number(amount));
      });
    });

    socket.on('host:kick', async (payload) => {
      const { playerId } = payload ?? {};
      await mutate(socket, io, (game) => {
        if (!isHost(game, data.playerId)) {
          throw new EngineError('not_host', 'Only the host can kick players');
        }
        removePlayer(game, playerId);
      });
    });

    socket.on('action:fold', async () => {
      await mutate(socket, io, (game) => fold(game, data.playerId!));
    });
    socket.on('action:check', async () => {
      await mutate(socket, io, (game) => check(game, data.playerId!));
    });
    socket.on('action:call', async () => {
      await mutate(socket, io, (game) => call(game, data.playerId!));
    });
    socket.on('action:raise', async (payload) => {
      const total = Number(payload?.totalAmount);
      await mutate(socket, io, (game) => raise(game, data.playerId!, total));
    });
    socket.on('action:allIn', async () => {
      await mutate(socket, io, (game) => allIn(game, data.playerId!));
    });

    socket.on('showdown:declareWinners', async (payload) => {
      const { potIndex, winnerIds } = payload ?? {};
      await mutate(socket, io, (game) => {
        if (!isHost(game, data.playerId)) {
          throw new EngineError('not_host', 'Only the host can declare winners');
        }
        declareWinners(game, Number(potIndex), Array.isArray(winnerIds) ? winnerIds : []);
      });
    });

    socket.on('disconnect', async () => {
      if (!data.gameCode || !data.playerId) return;
      const code = data.gameCode;
      const playerId = data.playerId;
      const game = getGame(code);
      if (!game) return;
      await withGameLock(code, () => {
        setConnected(game, playerId, false);
      });
      broadcast(io, game);
    });
  });
}

async function mutate(
  socket: Socket,
  io: IOServer,
  fn: (game: Game) => void,
): Promise<void> {
  const data = socket.data as SocketData;
  if (!data.gameCode) return sendError(socket, 'not_in_game', 'Not in a game');
  const game = getGame(data.gameCode);
  if (!game) return sendError(socket, 'game_not_found', 'Game not found');
  try {
    await withGameLock(game.code, () => fn(game));
    broadcast(io, game);
    broadcastLastAction(io, game);
    if (game.lastWinnings && game.hand?.phase === 'hand-complete') {
      io.to(room(game.code)).emit('hand:ended', { winnings: game.lastWinnings });
    }
  } catch (err) {
    if (err instanceof EngineError) {
      sendError(socket, err.code, err.message);
    } else {
      sendError(socket, 'internal', 'Internal error');
    }
  }
}
