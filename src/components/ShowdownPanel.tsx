'use client';
import { useState } from 'react';
import type { Game } from '../game/types';

interface Props {
  game: Game;
  isHost: boolean;
  onAward: (potIndex: number, winnerIds: string[]) => void;
}

export function ShowdownPanel({ game, isHost, onAward }: Props) {
  const hand = game.hand;
  if (!hand || hand.phase !== 'showdown') return null;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-felt-dark border-2 border-gold rounded-xl p-5 w-full max-w-md flex flex-col gap-4 shadow-2xl">
        <h2 className="font-display text-2xl text-gold text-center text-shadow-gold">Showdown</h2>
        {isHost ? (
          <p className="text-ivory/80 text-sm text-center">
            Look at the players&apos; cards. Tap the winner(s) for each pot to award it.
          </p>
        ) : (
          <p className="text-ivory/80 text-sm text-center">Waiting for the host to declare winners…</p>
        )}
        <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto no-scrollbar">
          {hand.pots.map((pot, i) => (
            <PotAwardRow
              key={i}
              game={game}
              potIndex={i}
              isHost={isHost}
              isAwarded={hand.awardedPotIndexes.includes(i)}
              pot={pot}
              onAward={onAward}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PotAwardRow({
  game,
  potIndex,
  isHost,
  isAwarded,
  pot,
  onAward,
}: {
  game: Game;
  potIndex: number;
  isHost: boolean;
  isAwarded: boolean;
  pot: { amount: number; eligiblePlayerIds: string[] };
  onAward: (potIndex: number, winnerIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  return (
    <div className={`border rounded-lg p-3 ${isAwarded ? 'border-ivory/20 opacity-50' : 'border-gold/40'}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="font-heading text-ivory">
          {potIndex === 0 ? 'Main Pot' : `Side Pot ${potIndex}`}
        </span>
        <span className="font-mono text-gold-light text-lg">{pot.amount.toLocaleString()}</span>
      </div>
      {isAwarded ? (
        <div className="text-sm text-ivory/60">Awarded</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {pot.eligiblePlayerIds.map((pid) => {
              const p = game.players.find((x) => x.id === pid);
              if (!p) return null;
              const isSel = selected.includes(pid);
              return (
                <button
                  key={pid}
                  disabled={!isHost}
                  onClick={() => toggle(pid)}
                  className={`px-2 py-2 rounded text-sm font-heading transition
                    ${isSel ? 'bg-gold text-felt-dark ring-2 ring-gold-light' : 'bg-black/40 text-ivory ring-1 ring-ivory/20'}
                    ${!isHost ? 'opacity-60' : ''}
                  `}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
          {isHost && (
            <button
              disabled={selected.length === 0}
              onClick={() => { onAward(potIndex, selected); setSelected([]); }}
              className="btn-gold w-full rounded py-2 text-sm uppercase tracking-wider"
            >
              Award Pot{selected.length > 1 ? ' (split)' : ''}
            </button>
          )}
        </>
      )}
    </div>
  );
}
