'use client';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import type { Game } from '../game/types';

interface Props {
  game: Game;
  isHost: boolean;
  onStart: () => void;
}

export function Lobby({ game, isHost, onStart }: Props) {
  const [origin, setOrigin] = useState('');
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  const joinUrl = origin ? `${origin}/j/${game.code}` : '';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="flex flex-col items-center mb-6">
        <div className="text-xs uppercase tracking-[0.3em] text-gold/80 font-heading">Game Code</div>
        <div className="font-display text-7xl text-gold text-shadow-gold tracking-[0.2em] mt-1">{game.code}</div>
      </div>

      {joinUrl && (
        <div className="bg-ivory p-3 rounded-lg mb-4">
          <QRCodeSVG value={joinUrl} size={160} bgColor="#f5e8c7" fgColor="#06251c" level="M" />
        </div>
      )}
      <button
        onClick={() => navigator.clipboard?.writeText(joinUrl)}
        className="text-xs text-ivory/60 mb-6 underline"
      >
        {joinUrl}
      </button>

      <div className="w-full max-w-sm bg-black/40 border border-gold/30 rounded-xl p-4 mb-6">
        <div className="text-xs uppercase tracking-wider text-gold/80 mb-3 font-heading">Players ({game.players.length})</div>
        <div className="flex flex-col gap-2">
          {game.players.map((p) => (
            <div key={p.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${p.connected ? 'bg-green-400' : 'bg-red-500'}`} />
                <span className="font-heading text-ivory">{p.name}</span>
                {p.id === game.hostId && <span className="text-[10px] uppercase text-gold-light tracking-wider">host</span>}
              </div>
              <span className="font-mono text-sm text-gold-light">{p.stack.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-ivory/50">
          Blinds: <span className="font-mono text-gold-light">{game.smallBlind}/{game.bigBlind}</span> · Starting stack: <span className="font-mono text-gold-light">{game.startingStack.toLocaleString()}</span>
        </div>
      </div>

      {isHost ? (
        <button
          onClick={onStart}
          disabled={game.players.length < 2}
          className="btn-gold rounded-md px-10 py-4 uppercase tracking-wider text-base"
        >
          {game.players.length < 2 ? 'Need 2+ players' : 'Start Hand'}
        </button>
      ) : (
        <div className="text-ivory/70 text-sm font-heading">Waiting for the host to start…</div>
      )}
    </div>
  );
}
