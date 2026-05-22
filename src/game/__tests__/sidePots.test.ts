import { describe, expect, it } from 'vitest';
import { computePots, distributePot } from '../sidePots';
import type { Player } from '../types';

function makePlayer(id: string, totalCommitted: number, folded = false): Player {
  return {
    id,
    name: id,
    stack: 100,
    seat: parseInt(id.replace(/\D/g, ''), 10) || 0,
    status: folded ? 'folded' : 'active',
    currentBet: 0,
    totalCommitted,
    hasActedThisRound: false,
    connected: true,
  };
}

describe('computePots', () => {
  it('single pot when everyone commits equally', () => {
    const players = [
      makePlayer('a', 100),
      makePlayer('b', 100),
      makePlayer('c', 100),
    ];
    const pots = computePots(players);
    expect(pots).toEqual([
      { amount: 300, eligiblePlayerIds: ['a', 'b', 'c'] },
    ]);
  });

  it('three-way all-in at different stack sizes creates main + side pots', () => {
    // a=20, b=50, c=100 → main pot 60 (3-way), side pot 60 (b+c), side pot 50 (c only)
    const players = [
      makePlayer('a', 20),
      makePlayer('b', 50),
      makePlayer('c', 100),
    ];
    const pots = computePots(players);
    expect(pots).toHaveLength(3);
    expect(pots[0]).toEqual({ amount: 60, eligiblePlayerIds: ['a', 'b', 'c'] });
    expect(pots[1]).toEqual({ amount: 60, eligiblePlayerIds: ['b', 'c'] });
    expect(pots[2]).toEqual({ amount: 50, eligiblePlayerIds: ['c'] });
  });

  it('folded players contribute to pots but are not eligible', () => {
    // a folded with 30 in, b=50, c=100
    const players = [
      makePlayer('a', 30, true),
      makePlayer('b', 50),
      makePlayer('c', 100),
    ];
    const pots = computePots(players);
    // level 30: contributors=3, eligible=[b,c], amount=90
    // level 50: contributors=2, eligible=[b,c], amount=40 → merges with prior
    // level 100: contributors=1, eligible=[c], amount=50
    expect(pots).toHaveLength(2);
    expect(pots[0]).toEqual({ amount: 130, eligiblePlayerIds: ['b', 'c'] });
    expect(pots[1]).toEqual({ amount: 50, eligiblePlayerIds: ['c'] });
  });

  it('all folded except one means single pot to that player', () => {
    const players = [
      makePlayer('a', 30, true),
      makePlayer('b', 30, true),
      makePlayer('c', 30),
    ];
    const pots = computePots(players);
    expect(pots).toEqual([{ amount: 90, eligiblePlayerIds: ['c'] }]);
  });
});

describe('distributePot', () => {
  it('even split', () => {
    const winnings = distributePot(100, ['a', 'b'], ['a', 'b', 'c']);
    expect(winnings).toEqual({ a: 50, b: 50 });
  });

  it('odd-chip remainder goes to first in seat order', () => {
    const winnings = distributePot(101, ['b', 'a'], ['c', 'a', 'b']);
    // seatOrder is [c, a, b]; first matching winner is 'a'
    expect(winnings.a).toBe(51);
    expect(winnings.b).toBe(50);
  });

  it('single winner takes all', () => {
    const winnings = distributePot(73, ['a'], ['a', 'b']);
    expect(winnings).toEqual({ a: 73 });
  });
});
