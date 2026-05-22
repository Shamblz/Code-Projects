import type { Player } from './types';

export function activePlayers(players: Player[]): Player[] {
  return players.filter((p) => p.status !== 'busted' && p.status !== 'sitting-out');
}

export function inHandPlayers(players: Player[]): Player[] {
  return players.filter(
    (p) => p.status === 'active' || p.status === 'all-in' || p.status === 'folded',
  );
}

/**
 * Find the next seat occupied by a player matching `predicate`, starting AFTER `fromSeat`.
 * Returns -1 if no such player exists.
 */
export function nextSeat(
  players: Player[],
  fromSeat: number,
  predicate: (p: Player) => boolean,
): number {
  const sorted = [...players].sort((a, b) => a.seat - b.seat);
  if (sorted.length === 0) return -1;
  const seats = sorted.map((p) => p.seat);
  const maxSeat = seats[seats.length - 1];

  for (let i = 1; i <= maxSeat + 1 + sorted.length; i++) {
    const candidateSeat = (fromSeat + i) % (maxSeat + 1);
    const player = sorted.find((p) => p.seat === candidateSeat);
    if (player && predicate(player)) return candidateSeat;
  }
  return -1;
}

/**
 * Determine dealer/SB/BB seats given the previous dealer seat and players currently
 * eligible for the hand (status !== 'busted' and !== 'sitting-out').
 *
 * Heads-up rule: dealer posts SB, the other player posts BB.
 */
export function computeBlindSeats(
  players: Player[],
  prevDealerSeat: number | null,
): { dealerSeat: number; sbSeat: number; bbSeat: number } {
  const eligible = activePlayers(players);
  if (eligible.length < 2) {
    throw new Error('Need at least 2 eligible players to start a hand');
  }

  const isEligible = (p: Player) =>
    p.status !== 'busted' && p.status !== 'sitting-out';

  const startFrom = prevDealerSeat ?? -1;
  const dealerSeat = nextSeat(players, startFrom, isEligible);
  if (dealerSeat === -1) throw new Error('No eligible dealer');

  if (eligible.length === 2) {
    const otherSeat = nextSeat(players, dealerSeat, isEligible);
    return { dealerSeat, sbSeat: dealerSeat, bbSeat: otherSeat };
  }

  const sbSeat = nextSeat(players, dealerSeat, isEligible);
  const bbSeat = nextSeat(players, sbSeat, isEligible);
  return { dealerSeat, sbSeat, bbSeat };
}
