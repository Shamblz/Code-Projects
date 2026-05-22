import type { Action, ActionType, Game, Hand, Player, Phase } from './types';
import { activePlayers, computeBlindSeats, nextSeat } from './rotation';
import { computePots, distributePot } from './sidePots';

export class EngineError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function findPlayer(game: Game, playerId: string): Player {
  const p = game.players.find((x) => x.id === playerId);
  if (!p) throw new EngineError('player_not_found', 'Player not in game');
  return p;
}

function logAction(game: Game, action: Action) {
  if (game.hand) game.hand.actions.push(action);
  game.history.push(action);
}

function buildAction(player: Player, type: ActionType, amount?: number): Action {
  return {
    ts: Date.now(),
    playerId: player.id,
    playerName: player.name,
    type,
    amount,
  };
}

// ---------- Lobby management ----------

export function createGame(
  code: string,
  hostId: string,
  hostName: string,
  startingStack: number,
  smallBlind: number,
  bigBlind: number,
): Game {
  if (smallBlind <= 0 || bigBlind <= 0 || bigBlind <= smallBlind) {
    throw new EngineError('invalid_blinds', 'Big blind must exceed small blind');
  }
  if (startingStack < bigBlind * 2) {
    throw new EngineError(
      'invalid_stack',
      'Starting stack must be at least 2x the big blind',
    );
  }
  const host: Player = {
    id: hostId,
    name: hostName,
    stack: startingStack,
    seat: 0,
    status: 'active',
    currentBet: 0,
    totalCommitted: 0,
    hasActedThisRound: false,
    connected: true,
  };
  return {
    code,
    hostId,
    startingStack,
    smallBlind,
    bigBlind,
    players: [host],
    hand: null,
    history: [],
    createdAt: Date.now(),
  };
}

export function addPlayer(game: Game, playerId: string, name: string): Player {
  if (game.players.find((p) => p.id === playerId)) {
    const p = findPlayer(game, playerId);
    p.connected = true;
    return p;
  }
  if (game.hand && game.hand.phase !== 'hand-complete') {
    throw new EngineError(
      'hand_in_progress',
      'Cannot join while a hand is in progress',
    );
  }
  const usedSeats = new Set(game.players.map((p) => p.seat));
  let seat = 0;
  while (usedSeats.has(seat)) seat++;
  const player: Player = {
    id: playerId,
    name: name.trim().slice(0, 20) || `Player ${seat + 1}`,
    stack: game.startingStack,
    seat,
    status: 'active',
    currentBet: 0,
    totalCommitted: 0,
    hasActedThisRound: false,
    connected: true,
  };
  game.players.push(player);
  return player;
}

export function setConnected(game: Game, playerId: string, connected: boolean) {
  const p = game.players.find((x) => x.id === playerId);
  if (p) p.connected = connected;
}

export function removePlayer(game: Game, playerId: string) {
  if (game.hand && game.hand.phase !== 'lobby' && game.hand.phase !== 'hand-complete') {
    const p = game.players.find((x) => x.id === playerId);
    if (p && p.status === 'active') p.status = 'folded';
    return;
  }
  game.players = game.players.filter((p) => p.id !== playerId);
}

export function rebuy(game: Game, playerId: string, amount: number) {
  const p = findPlayer(game, playerId);
  if (amount <= 0) throw new EngineError('invalid_amount', 'Rebuy amount must be positive');
  p.stack += amount;
  if (p.status === 'busted') p.status = 'active';
}

// ---------- Hand lifecycle ----------

export function startHand(game: Game) {
  const eligible = activePlayers(game.players);
  if (eligible.length < 2) {
    throw new EngineError(
      'not_enough_players',
      'Need at least 2 non-busted players to start',
    );
  }

  for (const p of game.players) {
    p.currentBet = 0;
    p.totalCommitted = 0;
    p.hasActedThisRound = false;
    if (p.status !== 'busted' && p.status !== 'sitting-out') p.status = 'active';
  }

  const prevDealer = game.hand?.dealerSeat ?? null;
  const { dealerSeat, sbSeat, bbSeat } = computeBlindSeats(game.players, prevDealer);

  const hand: Hand = {
    handNumber: (game.hand?.handNumber ?? 0) + 1,
    phase: 'preflop',
    dealerSeat,
    smallBlindSeat: sbSeat,
    bigBlindSeat: bbSeat,
    currentTurnSeat: -1,
    currentBetToCall: 0,
    minRaise: game.bigBlind,
    pots: [],
    actions: [],
    awardedPotIndexes: [],
  };
  game.hand = hand;
  game.lastWinnings = undefined;

  postBlind(game, sbSeat, game.smallBlind, 'post-sb');
  postBlind(game, bbSeat, game.bigBlind, 'post-bb');
  hand.currentBetToCall = game.bigBlind;
  hand.minRaise = game.bigBlind;

  // First to act preflop = next seat after BB
  hand.currentTurnSeat = nextSeat(
    game.players,
    bbSeat,
    (p) => p.status === 'active' && p.stack > 0,
  );

  // Edge case: everyone else is all-in from posting blinds. Skip to next phase.
  maybeAdvancePhase(game);
}

function postBlind(
  game: Game,
  seat: number,
  blindAmount: number,
  type: 'post-sb' | 'post-bb',
) {
  const player = game.players.find((p) => p.seat === seat);
  if (!player) throw new EngineError('seat_empty', 'No player at blind seat');
  const amount = Math.min(blindAmount, player.stack);
  player.stack -= amount;
  player.currentBet = amount;
  player.totalCommitted += amount;
  if (player.stack === 0) player.status = 'all-in';
  logAction(game, buildAction(player, type, amount));
}

// ---------- Player actions ----------

function ensureTurn(game: Game, playerId: string): { hand: Hand; player: Player } {
  if (!game.hand) throw new EngineError('no_hand', 'No active hand');
  const hand = game.hand;
  if (
    hand.phase !== 'preflop' &&
    hand.phase !== 'flop' &&
    hand.phase !== 'turn' &&
    hand.phase !== 'river'
  ) {
    throw new EngineError('wrong_phase', 'Not a betting phase');
  }
  const player = findPlayer(game, playerId);
  if (player.seat !== hand.currentTurnSeat) {
    throw new EngineError('not_your_turn', "Not your turn");
  }
  return { hand, player };
}

export function fold(game: Game, playerId: string) {
  const { player } = ensureTurn(game, playerId);
  player.status = 'folded';
  player.hasActedThisRound = true;
  logAction(game, buildAction(player, 'fold'));
  postActionAdvance(game);
}

export function check(game: Game, playerId: string) {
  const { hand, player } = ensureTurn(game, playerId);
  if (player.currentBet < hand.currentBetToCall) {
    throw new EngineError('cannot_check', 'There is a bet to call');
  }
  player.hasActedThisRound = true;
  logAction(game, buildAction(player, 'check'));
  postActionAdvance(game);
}

export function call(game: Game, playerId: string) {
  const { hand, player } = ensureTurn(game, playerId);
  const needed = hand.currentBetToCall - player.currentBet;
  if (needed <= 0) {
    throw new EngineError('nothing_to_call', 'Nothing to call — use check');
  }
  const amount = Math.min(needed, player.stack);
  player.stack -= amount;
  player.currentBet += amount;
  player.totalCommitted += amount;
  player.hasActedThisRound = true;
  if (player.stack === 0) player.status = 'all-in';
  logAction(game, buildAction(player, 'call', amount));
  postActionAdvance(game);
}

/**
 * Raise to a TOTAL amount this round (not a delta).
 * A min legal raise pushes currentBetToCall up by at least `minRaise`.
 * All-in raises below `minRaise` are allowed but don't reopen action for
 * players already matched (standard no-limit rule).
 */
export function raise(game: Game, playerId: string, totalAmount: number) {
  const { hand, player } = ensureTurn(game, playerId);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    throw new EngineError('invalid_amount', 'Invalid raise amount');
  }
  const target = Math.floor(totalAmount);
  if (target <= hand.currentBetToCall) {
    throw new EngineError(
      'raise_too_small',
      'Raise must exceed the current bet',
    );
  }
  const delta = target - player.currentBet;
  if (delta > player.stack) {
    throw new EngineError('insufficient_chips', 'Not enough chips');
  }

  const raiseSize = target - hand.currentBetToCall;
  const isAllIn = delta === player.stack;
  const isFullRaise = raiseSize >= hand.minRaise;

  if (!isFullRaise && !isAllIn) {
    throw new EngineError(
      'raise_too_small',
      `Minimum raise is ${hand.currentBetToCall + hand.minRaise}`,
    );
  }

  player.stack -= delta;
  player.currentBet = target;
  player.totalCommitted += delta;
  if (player.stack === 0) player.status = 'all-in';
  player.hasActedThisRound = true;

  const wasOpeningBet = hand.currentBetToCall === 0;

  if (isFullRaise) {
    hand.minRaise = raiseSize;
    hand.currentBetToCall = target;
    // Reopen action: everyone else who has acted but not matched gets to act again
    for (const other of game.players) {
      if (
        other.id !== player.id &&
        other.status === 'active' &&
        other.currentBet < hand.currentBetToCall
      ) {
        other.hasActedThisRound = false;
      }
    }
  } else {
    // Short all-in: raise the bar but don't reopen for already-matched players
    hand.currentBetToCall = target;
    for (const other of game.players) {
      if (
        other.id !== player.id &&
        other.status === 'active' &&
        other.currentBet < hand.currentBetToCall &&
        other.hasActedThisRound === false
      ) {
        // they still need to act anyway — no change
      }
    }
  }

  const actionType: ActionType = wasOpeningBet ? 'bet' : isAllIn ? 'all-in' : 'raise';
  logAction(game, buildAction(player, actionType, target));
  postActionAdvance(game);
}

export function allIn(game: Game, playerId: string) {
  const { hand, player } = ensureTurn(game, playerId);
  if (player.stack === 0) {
    throw new EngineError('no_chips', 'No chips to push');
  }
  const target = player.currentBet + player.stack;

  if (target > hand.currentBetToCall) {
    raise(game, playerId, target);
    return;
  }

  // All-in for less than the call — treat as forced call
  const amount = player.stack;
  player.stack = 0;
  player.currentBet += amount;
  player.totalCommitted += amount;
  player.status = 'all-in';
  player.hasActedThisRound = true;
  logAction(game, buildAction(player, 'all-in', target));
  postActionAdvance(game);
}

// ---------- Phase advancement ----------

function inHandActive(p: Player): boolean {
  return p.status === 'active';
}

function isStillInHand(p: Player): boolean {
  return p.status === 'active' || p.status === 'all-in';
}

function bettingRoundComplete(game: Game): boolean {
  const hand = game.hand!;
  const remaining = game.players.filter(isStillInHand);
  if (remaining.length <= 1) return true;
  const stillActing = remaining.filter((p) => p.status === 'active');
  if (stillActing.length === 0) return true;
  for (const p of stillActing) {
    if (!p.hasActedThisRound) return false;
    if (p.currentBet !== hand.currentBetToCall) return false;
  }
  return true;
}

function postActionAdvance(game: Game) {
  const hand = game.hand!;

  // If only one player remains in the hand, end immediately.
  const stillIn = game.players.filter(isStillInHand);
  if (stillIn.length === 1) {
    return endHandSingleWinner(game, stillIn[0].id);
  }

  if (bettingRoundComplete(game)) {
    maybeAdvancePhase(game);
    return;
  }

  hand.currentTurnSeat = nextSeat(
    game.players,
    hand.currentTurnSeat,
    inHandActive,
  );
}

function maybeAdvancePhase(game: Game) {
  const hand = game.hand!;
  const stillIn = game.players.filter(isStillInHand);

  if (stillIn.length === 1) {
    endHandSingleWinner(game, stillIn[0].id);
    return;
  }

  // If betting round complete OR everyone remaining is all-in, advance phase.
  const stillActing = stillIn.filter((p) => p.status === 'active');
  const skipBetting = stillActing.length <= 1;
  if (!skipBetting && !bettingRoundComplete(game)) return;

  refundUncalledBets(game);

  const next = nextPhase(hand.phase);
  if (next === 'showdown') {
    resetRoundForNextStreet(game);
    hand.phase = 'showdown';
    hand.pots = computePots(game.players);
    hand.currentTurnSeat = -1;
    return;
  }

  resetRoundForNextStreet(game);
  hand.phase = next;
  hand.currentTurnSeat = nextSeat(
    game.players,
    hand.dealerSeat,
    inHandActive,
  );

  // If everyone is all-in we keep skipping until we reach showdown.
  if (game.players.filter(inHandActive).length <= 1) {
    maybeAdvancePhase(game);
  }
}

/**
 * Uncalled-bet refund: if one player committed more than any opponent could call
 * (e.g. all-in raise with no callers, or the only opponent folded to a bet),
 * return the excess to that player.
 */
function refundUncalledBets(game: Game) {
  const inHand = game.players.filter(isStillInHand);
  if (inHand.length <= 1) return;
  const bets = inHand.map((p) => p.currentBet).sort((a, b) => b - a);
  const top = bets[0];
  const second = bets[1];
  if (top <= second) return;
  const topPlayer = inHand.find((p) => p.currentBet === top)!;
  const refund = top - second;
  topPlayer.stack += refund;
  topPlayer.currentBet = second;
  topPlayer.totalCommitted -= refund;
}

function nextPhase(p: Phase): Phase {
  switch (p) {
    case 'preflop': return 'flop';
    case 'flop': return 'turn';
    case 'turn': return 'river';
    case 'river': return 'showdown';
    default: return p;
  }
}

function resetRoundForNextStreet(game: Game) {
  const hand = game.hand!;
  for (const p of game.players) {
    p.currentBet = 0;
    p.hasActedThisRound = false;
  }
  hand.currentBetToCall = 0;
  hand.minRaise = game.bigBlind;
}

function endHandSingleWinner(game: Game, winnerId: string) {
  const hand = game.hand!;
  const totalPot = game.players.reduce((s, p) => s + p.totalCommitted, 0);
  const winner = game.players.find((p) => p.id === winnerId)!;
  winner.stack += totalPot;
  game.lastWinnings = [{ playerId: winnerId, amount: totalPot }];
  hand.pots = [{ amount: totalPot, eligiblePlayerIds: [winnerId] }];
  hand.awardedPotIndexes = [0];
  hand.phase = 'hand-complete';
  hand.currentTurnSeat = -1;
  finalizeBusts(game);
}

// ---------- Showdown ----------

export function declareWinners(game: Game, potIndex: number, winnerIds: string[]) {
  if (!game.hand) throw new EngineError('no_hand', 'No active hand');
  const hand = game.hand;
  if (hand.phase !== 'showdown') {
    throw new EngineError('wrong_phase', 'Not in showdown');
  }
  if (hand.awardedPotIndexes.includes(potIndex)) {
    throw new EngineError('already_awarded', 'Pot already awarded');
  }
  const pot = hand.pots[potIndex];
  if (!pot) throw new EngineError('invalid_pot', 'No such pot');
  if (winnerIds.length === 0) {
    throw new EngineError('no_winners', 'Must pick at least one winner');
  }
  for (const w of winnerIds) {
    if (!pot.eligiblePlayerIds.includes(w)) {
      throw new EngineError('ineligible_winner', 'Player not eligible for this pot');
    }
  }

  const seatOrder = seatOrderFromDealer(game);
  const winnings = distributePot(pot.amount, winnerIds, seatOrder);
  if (!game.lastWinnings) game.lastWinnings = [];
  for (const [id, amt] of Object.entries(winnings)) {
    const player = game.players.find((p) => p.id === id);
    if (player) {
      player.stack += amt;
      const existing = game.lastWinnings.find((w) => w.playerId === id);
      if (existing) existing.amount += amt;
      else game.lastWinnings.push({ playerId: id, amount: amt });
    }
  }
  hand.awardedPotIndexes.push(potIndex);

  if (hand.awardedPotIndexes.length === hand.pots.length) {
    hand.phase = 'hand-complete';
    finalizeBusts(game);
  }
}

function seatOrderFromDealer(game: Game): string[] {
  const hand = game.hand!;
  const sorted = [...game.players].sort((a, b) => a.seat - b.seat);
  if (sorted.length === 0) return [];
  const maxSeat = Math.max(...sorted.map((p) => p.seat));
  const result: string[] = [];
  for (let i = 1; i <= maxSeat + 1; i++) {
    const seat = (hand.dealerSeat + i) % (maxSeat + 1);
    const p = sorted.find((x) => x.seat === seat);
    if (p) result.push(p.id);
  }
  return result;
}

function finalizeBusts(game: Game) {
  for (const p of game.players) {
    if (p.stack === 0 && p.status !== 'sitting-out') {
      p.status = 'busted';
    } else if (p.status === 'all-in' && p.stack > 0) {
      p.status = 'active';
    }
  }
}
