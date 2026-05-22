import { describe, expect, it } from 'vitest';
import {
  addPlayer,
  call,
  check,
  createGame,
  declareWinners,
  fold,
  raise,
  startHand,
  allIn,
} from '../engine';
import type { Game } from '../types';

function setupGame(playerCount: number, startingStack = 1000): Game {
  const game = createGame('TEST', 'host', 'Host', startingStack, 5, 10);
  for (let i = 1; i < playerCount; i++) {
    addPlayer(game, `p${i}`, `Player ${i}`);
  }
  return game;
}

describe('createGame', () => {
  it('rejects invalid blinds', () => {
    expect(() => createGame('X', 'h', 'H', 1000, 10, 10)).toThrow();
    expect(() => createGame('X', 'h', 'H', 1000, 20, 10)).toThrow();
  });
  it('rejects starting stack smaller than 2x BB', () => {
    expect(() => createGame('X', 'h', 'H', 19, 5, 10)).toThrow();
  });
});

describe('startHand — blind rotation', () => {
  it('first hand: host=seat0=dealer, p1=SB, p2=BB in 3-player game', () => {
    const game = setupGame(3);
    startHand(game);
    expect(game.hand?.dealerSeat).toBe(0);
    expect(game.hand?.smallBlindSeat).toBe(1);
    expect(game.hand?.bigBlindSeat).toBe(2);
    // First to act = seat after BB = seat 0 (host)
    expect(game.hand?.currentTurnSeat).toBe(0);
  });

  it('heads-up: dealer posts SB, other player posts BB', () => {
    const game = setupGame(2);
    startHand(game);
    expect(game.hand?.dealerSeat).toBe(0);
    expect(game.hand?.smallBlindSeat).toBe(0);
    expect(game.hand?.bigBlindSeat).toBe(1);
  });

  it('rotates dealer on next hand', () => {
    const game = setupGame(3);
    startHand(game);
    // Fast-fold to end hand
    fold(game, 'host'); // seat 0 folds
    fold(game, 'p1');   // seat 1 folds → p2 wins
    expect(game.hand?.phase).toBe('hand-complete');

    startHand(game);
    expect(game.hand?.dealerSeat).toBe(1);
    expect(game.hand?.smallBlindSeat).toBe(2);
    expect(game.hand?.bigBlindSeat).toBe(0);
  });
});

describe('betting actions', () => {
  it('fold-to-one-player auto-awards pot', () => {
    const game = setupGame(3);
    startHand(game);
    const initialP2Stack = game.players.find((p) => p.id === 'p2')!.stack;
    fold(game, 'host');
    fold(game, 'p1');
    expect(game.hand?.phase).toBe('hand-complete');
    // Pot = SB + BB = 5 + 10 = 15, all goes to p2
    const p2 = game.players.find((p) => p.id === 'p2')!;
    // p2 already paid 10 (BB) before initialP2Stack was captured, then wins 15-chip pot
    expect(p2.stack).toBe(initialP2Stack + 15);
  });

  it('check on flop when no bets are made advances to turn', () => {
    const game = setupGame(3);
    startHand(game);
    // Preflop: host (seat 0, first to act) calls 10, p1 (SB) calls 5 more, p2 (BB) checks
    call(game, 'host');
    call(game, 'p1');
    check(game, 'p2');
    expect(game.hand?.phase).toBe('flop');

    // Flop: first to act is seat 1 (p1, first active after dealer)
    expect(game.hand?.currentTurnSeat).toBe(1);
    check(game, 'p1');
    check(game, 'p2');
    check(game, 'host');
    expect(game.hand?.phase).toBe('turn');
  });

  it('raise reopens action for already-acted players', () => {
    const game = setupGame(3);
    startHand(game);
    // Preflop. To-call = 10.
    raise(game, 'host', 30); // host raises to 30
    call(game, 'p1');         // p1 calls (added 25)
    raise(game, 'p2', 80);    // p2 re-raises to 80
    // host needs to act again
    expect(game.hand?.currentTurnSeat).toBe(0);
    fold(game, 'host');
    call(game, 'p1');         // p1 calls the re-raise
    expect(game.hand?.phase).toBe('flop');
  });

  it('rejects raise below min raise', () => {
    const game = setupGame(3);
    startHand(game);
    // First-to-act = host. To-call = 10. minRaise = 10. Min legal total = 20.
    expect(() => raise(game, 'host', 15)).toThrow();
    raise(game, 'host', 20); // exactly min raise - OK
  });

  it('all-in short raise does not reopen action for already-matched players', () => {
    const game = createGame('T', 'host', 'H', 1000, 5, 10);
    addPlayer(game, 'p1', 'P1');
    addPlayer(game, 'p2', 'P2');
    // Set p2 with small stack
    game.players.find((p) => p.id === 'p2')!.stack = 15;
    startHand(game);
    // Preflop: host first, raises to 50
    raise(game, 'host', 50);
    call(game, 'p1');
    // p2 has only 15 - posted BB of 10, so 5 left. They go all-in.
    allIn(game, 'p2'); // total bet 15, short of 50
    // host and p1 already matched at 50 — should NOT have to act again
    expect(game.hand?.phase).toBe('flop');
  });
});

describe('showdown and side pots', () => {
  it('three-way all-in: side pots computed correctly at showdown', () => {
    const game = createGame('T', 'host', 'H', 1000, 5, 10);
    addPlayer(game, 'p1', 'P1');
    addPlayer(game, 'p2', 'P2');
    game.players.find((p) => p.id === 'host')!.stack = 100;
    game.players.find((p) => p.id === 'p1')!.stack = 50;
    game.players.find((p) => p.id === 'p2')!.stack = 200;
    startHand(game);
    // Everyone all-in
    allIn(game, 'host'); // commits 100
    allIn(game, 'p1');   // commits 50
    allIn(game, 'p2');   // commits min(200, 100) — wait, p2 was BB at 10
    // After blinds: host stack 100, p1 (SB) stack 45, p2 (BB) stack 190
    // host all-in: 100 commit. p1 all-in: 50 commit (short of 100). p2 calls 100 total.
    // Final: host=100, p1=50, p2=100 committed.
    // Main pot 150 (3-way 50), side pot 100 (host+p2 each 50)
    expect(game.hand?.phase).toBe('showdown');
    expect(game.hand?.pots).toHaveLength(2);
    expect(game.hand?.pots[0].amount).toBe(150);
    expect(game.hand?.pots[0].eligiblePlayerIds.sort()).toEqual(['host', 'p1', 'p2']);
    expect(game.hand?.pots[1].amount).toBe(100);
    expect(game.hand?.pots[1].eligiblePlayerIds.sort()).toEqual(['host', 'p2']);
  });

  it('declareWinners distributes pot evenly and handles split-pot remainder', () => {
    const game = setupGame(3);
    startHand(game);
    // Get all to showdown via checks
    call(game, 'host');
    call(game, 'p1');
    check(game, 'p2');
    check(game, 'p1'); check(game, 'p2'); check(game, 'host'); // flop
    check(game, 'p1'); check(game, 'p2'); check(game, 'host'); // turn
    check(game, 'p1'); check(game, 'p2'); check(game, 'host'); // river
    expect(game.hand?.phase).toBe('showdown');
    // Pot is 30 (10 each)
    expect(game.hand?.pots[0].amount).toBe(30);
    // Split between host & p1
    declareWinners(game, 0, ['host', 'p1']);
    expect(game.hand?.phase).toBe('hand-complete');
    const host = game.players.find((p) => p.id === 'host')!;
    const p1 = game.players.find((p) => p.id === 'p1')!;
    // Each won 15 of 30
    expect(host.stack).toBe(1000 - 10 + 15);
    expect(p1.stack).toBe(1000 - 10 + 15);
  });
});

describe('busts', () => {
  it('marks player busted when stack hits 0 after hand', () => {
    const game = createGame('T', 'host', 'H', 1000, 5, 10);
    addPlayer(game, 'p1', 'P1');
    game.players.find((p) => p.id === 'p1')!.stack = 20;
    startHand(game); // heads-up: host=dealer=SB(5), p1=BB(10) → host stack 995, p1 stack 10
    allIn(game, 'host'); // host raises all-in
    call(game, 'p1');
    // Both all-in (p1 was all-in via call). Phase advances through flop/turn/river to showdown.
    expect(game.hand?.phase).toBe('showdown');
    // Award to host
    declareWinners(game, 0, ['host']);
    const p1 = game.players.find((p) => p.id === 'p1')!;
    expect(p1.status).toBe('busted');
    expect(p1.stack).toBe(0);
  });
});
