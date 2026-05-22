'use client';
import { useState } from 'react';
import type { Game, Player } from '../game/types';

interface ActionBarProps {
  game: Game;
  me: Player;
  onFold: () => void;
  onCheck: () => void;
  onCall: () => void;
  onRaise: (total: number) => void;
  onAllIn: () => void;
}

export function ActionBar({ game, me, onFold, onCheck, onCall, onRaise, onAllIn }: ActionBarProps) {
  const hand = game.hand!;
  const isMyTurn = hand.currentTurnSeat === me.seat && me.status === 'active';
  const toCall = Math.max(0, hand.currentBetToCall - me.currentBet);
  const canCheck = toCall === 0;
  const minRaiseTotal = hand.currentBetToCall + hand.minRaise;
  const maxTotal = me.currentBet + me.stack;
  const cappedMin = Math.min(minRaiseTotal, maxTotal);
  const [raiseTotal, setRaiseTotal] = useState<number>(cappedMin);
  const [showRaise, setShowRaise] = useState(false);

  if (!isMyTurn) {
    return (
      <div className="fixed bottom-0 inset-x-0 z-30 bg-black/80 backdrop-blur border-t border-gold/40 py-3 text-center text-ivory/70 text-sm font-heading">
        {me.status === 'folded' && 'You folded — waiting for hand to end'}
        {me.status === 'all-in' && 'You\'re all-in — waiting for showdown'}
        {me.status === 'busted' && 'You\'re busted — ask host for a rebuy'}
        {me.status === 'active' && 'Waiting for your turn…'}
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 bg-black/85 backdrop-blur border-t border-gold/40 px-3 py-3">
      {showRaise && (
        <div className="mb-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-ivory/80">
            <span>Raise to</span>
            <span className="font-mono text-lg text-gold-light">{raiseTotal}</span>
          </div>
          <input
            type="range"
            min={cappedMin}
            max={maxTotal}
            step={Math.max(1, game.smallBlind)}
            value={raiseTotal}
            onChange={(e) => setRaiseTotal(parseInt(e.target.value))}
            className="w-full accent-[#d4af37]"
          />
          <div className="grid grid-cols-4 gap-2">
            {[cappedMin, Math.round(maxTotal * 0.33), Math.round(maxTotal * 0.66), maxTotal].map((v, i) => (
              <button
                key={i}
                onClick={() => setRaiseTotal(Math.max(cappedMin, Math.min(maxTotal, v)))}
                className="btn-felt rounded text-xs py-1.5"
              >
                {i === 0 ? 'Min' : i === 3 ? 'Max' : `${Math.round((v / maxTotal) * 100)}%`}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setShowRaise(false)} className="btn-felt rounded py-2">Cancel</button>
            <button
              onClick={() => { onRaise(raiseTotal); setShowRaise(false); }}
              className="btn-gold rounded py-2"
            >
              Confirm
            </button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        <button onClick={onFold} className="btn-velvet rounded-md py-3 uppercase tracking-wider text-sm">
          Fold
        </button>
        <button
          onClick={canCheck ? onCheck : onCall}
          className="btn-felt rounded-md py-3 uppercase tracking-wider text-sm"
        >
          {canCheck ? 'Check' : `Call ${toCall}`}
        </button>
        {maxTotal > hand.currentBetToCall ? (
          <button
            onClick={() => { setRaiseTotal(cappedMin); setShowRaise(true); }}
            className="btn-gold rounded-md py-3 uppercase tracking-wider text-sm"
          >
            {hand.currentBetToCall === 0 ? 'Bet' : 'Raise'}
          </button>
        ) : (
          <button onClick={onAllIn} className="btn-gold rounded-md py-3 uppercase tracking-wider text-sm">
            All-In
          </button>
        )}
      </div>
    </div>
  );
}
