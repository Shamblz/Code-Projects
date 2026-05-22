'use client';
import { useEffect, useState } from 'react';
import type { Game, Player } from '../game/types';
import { PotDisplay } from './PotDisplay';
import { Seat } from './Seat';

interface TableProps {
  game: Game;
  myPlayerId: string | null;
  winnerIds: Set<string>;
}

/**
 * Layout: the current player is pinned at the bottom of the oval.
 * Other players are arranged around the rest of the oval clockwise.
 */
export function Table({ game, myPlayerId, winnerIds }: TableProps) {
  const [size, setSize] = useState({ w: 320, h: 460 });

  useEffect(() => {
    const update = () => {
      const w = Math.min(window.innerWidth - 24, 460);
      const h = Math.min(window.innerHeight - 220, 560);
      setSize({ w, h });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const me = game.players.find((p) => p.id === myPlayerId);
  const others = game.players.filter((p) => p.id !== myPlayerId);

  // Spread others across the top portion of the oval (from left around the top to right).
  const N = others.length;
  const positions = others.map((p, i) => {
    if (N === 0) return { x: 0.5, y: 0.5 };
    // angle goes from pi+0.3 around the top to -0.3, sweeping over the top half.
    const t = N === 1 ? 0.5 : i / (N - 1);
    const angle = Math.PI + 0.3 + t * (Math.PI - 0.6);
    const cx = 0.5 + 0.42 * Math.cos(angle);
    const cy = 0.5 + 0.42 * Math.sin(angle);
    return { x: cx, y: cy, player: p };
  });

  const tableW = size.w;
  const tableH = Math.max(size.h, 360);

  return (
    <div className="relative w-full flex flex-col items-center pt-2">
      <div
        className="felt-table relative mx-auto"
        style={{ width: tableW, height: tableH }}
      >
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <PotDisplay game={game} />
        </div>
        {positions.map(({ x, y, player }, i) => (
          <div
            key={player!.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
          >
            <Seat
              player={player!}
              isYou={false}
              isHost={player!.id === game.hostId}
              hand={game.hand}
              isWinner={winnerIds.has(player!.id)}
            />
          </div>
        ))}
      </div>
      {me && (
        <div className="mt-4 mb-20">
          <SelfSeat me={me} hand={game.hand} isHost={me.id === game.hostId} isWinner={winnerIds.has(me.id)} />
        </div>
      )}
    </div>
  );
}

function SelfSeat({ me, hand, isHost, isWinner }: { me: Player; hand: Game['hand']; isHost: boolean; isWinner: boolean }) {
  const isTurn = hand && hand.currentTurnSeat === me.seat;
  return (
    <div className={`px-5 py-3 rounded-2xl ring-2 transition-all
      ${isTurn ? 'ring-gold shadow-gold-glow bg-gold/15' : 'ring-gold/40 bg-black/50'}
      ${isWinner ? 'animate-pot-pulse' : ''}
    `}>
      <div className="flex items-center justify-between gap-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-gold/80 font-heading">You</div>
          <div className="font-heading text-xl text-ivory">{me.name}</div>
          {isHost && <div className="text-[10px] uppercase text-gold-light tracking-wider">host</div>}
        </div>
        <div className="text-right">
          <div className="font-mono text-3xl text-gold-light font-bold">{me.stack.toLocaleString()}</div>
          {me.currentBet > 0 && <div className="font-mono text-xs text-ivory/70">In: {me.currentBet}</div>}
        </div>
      </div>
    </div>
  );
}
