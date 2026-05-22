import type { Player, PotShare } from './types';

/**
 * Compute pots and side pots from per-player commitments.
 *
 * Includes folded players as contributors (their money stays in the pot)
 * but only non-folded players are eligible to win each pot share.
 *
 * Adjacent pots with identical eligibility sets are merged.
 */
export function computePots(players: Player[]): PotShare[] {
  const contributors = players.filter((p) => p.totalCommitted > 0);
  if (contributors.length === 0) return [];

  const levels = Array.from(
    new Set(contributors.map((p) => p.totalCommitted)),
  ).sort((a, b) => a - b);

  const pots: PotShare[] = [];
  let prev = 0;

  for (const level of levels) {
    const contributorsAtLevel = contributors.filter(
      (p) => p.totalCommitted >= level,
    );
    const eligible = contributorsAtLevel
      .filter((p) => p.status !== 'folded')
      .map((p) => p.id)
      .sort();

    if (eligible.length === 0) {
      prev = level;
      continue;
    }

    const amount = (level - prev) * contributorsAtLevel.length;
    if (amount <= 0) {
      prev = level;
      continue;
    }

    const last = pots[pots.length - 1];
    if (
      last &&
      last.eligiblePlayerIds.length === eligible.length &&
      last.eligiblePlayerIds.every((id, i) => id === eligible[i])
    ) {
      last.amount += amount;
    } else {
      pots.push({ amount, eligiblePlayerIds: eligible });
    }
    prev = level;
  }

  return pots;
}

/**
 * Distribute a pot evenly among winners.
 * Indivisible remainder is given to the earliest-seated winner among those
 * passed in `seatOrder` (poker convention: first active seat left of dealer).
 */
export function distributePot(
  potAmount: number,
  winnerIds: string[],
  seatOrder: string[],
): Record<string, number> {
  const winnings: Record<string, number> = {};
  if (winnerIds.length === 0 || potAmount === 0) return winnings;

  const share = Math.floor(potAmount / winnerIds.length);
  const remainder = potAmount - share * winnerIds.length;

  for (const id of winnerIds) winnings[id] = share;

  if (remainder > 0) {
    const firstByOrder = seatOrder.find((id) => winnerIds.includes(id));
    if (firstByOrder) winnings[firstByOrder] += remainder;
  }

  return winnings;
}
