'use client';
import { useState } from 'react';
import type { Game } from '../game/types';

interface Props {
  game: Game;
  onStartHand: () => void;
  onRebuy: (playerId: string, amount: number) => void;
  onKick: (playerId: string) => void;
}

export function HostControls({ game, onStartHand, onRebuy, onKick }: Props) {
  const [open, setOpen] = useState(false);
  const canStart =
    !game.hand ||
    game.hand.phase === 'hand-complete' ||
    game.hand.phase === 'lobby';
  const enoughPlayers = game.players.filter((p) => p.status !== 'busted' && p.status !== 'sitting-out').length >= 2;

  return (
    <>
      {canStart && enoughPlayers && (
        <button
          onClick={onStartHand}
          className="btn-gold rounded-full px-5 py-2 text-sm uppercase tracking-wider shadow-gold-glow"
        >
          {game.hand ? 'Next Hand' : 'Start Hand'}
        </button>
      )}
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-2 rounded-full bg-black/60 text-gold text-xs border border-gold/40 uppercase tracking-wider"
      >
        ♛ Host
      </button>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-felt-dark border border-gold rounded-xl p-5 w-full max-w-md max-h-[80vh] overflow-y-auto no-scrollbar" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-heading text-xl text-gold">Host Controls</h3>
              <button onClick={() => setOpen(false)} className="text-ivory/60 text-2xl leading-none">×</button>
            </div>
            <div className="flex flex-col gap-3">
              {game.players.map((p) => (
                <PlayerAdminRow
                  key={p.id}
                  game={game}
                  playerId={p.id}
                  onRebuy={onRebuy}
                  onKick={onKick}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PlayerAdminRow({
  game,
  playerId,
  onRebuy,
  onKick,
}: {
  game: Game;
  playerId: string;
  onRebuy: (playerId: string, amount: number) => void;
  onKick: (playerId: string) => void;
}) {
  const p = game.players.find((x) => x.id === playerId)!;
  const [amount, setAmount] = useState(game.startingStack);
  const isHost = p.id === game.hostId;
  return (
    <div className="flex items-center justify-between gap-2 border border-ivory/10 rounded-lg p-2">
      <div className="flex-1 min-w-0">
        <div className="font-heading text-ivory truncate">{p.name}{isHost && ' ♛'}</div>
        <div className="font-mono text-xs text-gold-light">{p.stack.toLocaleString()} · {p.status}</div>
      </div>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 1))}
        className="input-vegas font-mono text-sm w-20"
      />
      <button
        onClick={() => onRebuy(p.id, amount)}
        className="btn-gold rounded px-2 py-1 text-xs uppercase"
      >
        Rebuy
      </button>
      {!isHost && (
        <button
          onClick={() => onKick(p.id)}
          className="btn-velvet rounded px-2 py-1 text-xs uppercase"
        >
          Kick
        </button>
      )}
    </div>
  );
}
