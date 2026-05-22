'use client';
import { useState } from 'react';
import type { Action } from '../game/types';

const ACTION_LABEL: Record<Action['type'], string> = {
  fold: 'folds',
  check: 'checks',
  call: 'calls',
  bet: 'bets',
  raise: 'raises to',
  'all-in': 'all-in',
  'post-sb': 'posts SB',
  'post-bb': 'posts BB',
};

export function ActionLog({ actions }: { actions: Action[] }) {
  const [open, setOpen] = useState(false);
  const recent = actions.slice(-30).reverse();

  return (
    <div className="fixed bottom-20 right-2 z-20">
      <button
        onClick={() => setOpen((o) => !o)}
        className="px-3 py-1 rounded-full bg-black/70 text-gold text-xs border border-gold/40 uppercase tracking-wider"
      >
        {open ? 'Hide log' : 'Log'}
      </button>
      {open && (
        <div className="mt-2 w-72 max-h-[40vh] overflow-y-auto no-scrollbar bg-black/85 backdrop-blur border border-gold/30 rounded-lg p-3 text-xs">
          {recent.length === 0 && <div className="text-ivory/50">No actions yet.</div>}
          {recent.map((a, i) => (
            <div key={i} className="flex justify-between items-baseline mb-1">
              <span className="text-ivory">
                <span className="text-gold-light">{a.playerName}</span> {ACTION_LABEL[a.type]}
              </span>
              {a.amount !== undefined && <span className="font-mono text-gold-light">{a.amount}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
