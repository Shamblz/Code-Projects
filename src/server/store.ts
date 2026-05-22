import PQueue from 'p-queue';
import type { Game } from '../game/types';

const games = new Map<string, Game>();
const queues = new Map<string, PQueue>();

export function getGame(code: string): Game | undefined {
  return games.get(code);
}

export function saveGame(game: Game): void {
  games.set(game.code, game);
}

export function removeGame(code: string): void {
  games.delete(code);
  queues.delete(code);
}

export function listCodes(): Set<string> {
  return new Set(games.keys());
}

/**
 * Serialize mutations on a single game to avoid races between concurrent socket events.
 */
export async function withGameLock<T>(code: string, fn: () => T | Promise<T>): Promise<T> {
  let q = queues.get(code);
  if (!q) {
    q = new PQueue({ concurrency: 1 });
    queues.set(code, q);
  }
  return q.add(fn) as Promise<T>;
}

/**
 * Garbage-collect games older than `maxAgeMs` with no connected players.
 * Run periodically from the server entrypoint.
 */
export function gcStaleGames(maxAgeMs = 6 * 60 * 60 * 1000): number {
  const now = Date.now();
  let removed = 0;
  for (const [code, g] of games.entries()) {
    const anyConnected = g.players.some((p) => p.connected);
    if (!anyConnected && now - g.createdAt > maxAgeMs) {
      removeGame(code);
      removed++;
    }
  }
  return removed;
}
