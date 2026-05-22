'use client';
import { motion } from 'framer-motion';
import type { Game } from '../game/types';
import { ChipStack } from './ChipStack';

export function PotDisplay({ game }: { game: Game }) {
  const hand = game.hand;
  if (!hand) return null;

  // During betting rounds, sum totalCommitted + currentBets in flight
  const livePot =
    hand.phase === 'showdown' || hand.phase === 'hand-complete'
      ? hand.pots.reduce((s, p) => s + p.amount, 0)
      : game.players.reduce((s, p) => s + p.totalCommitted, 0);

  return (
    <motion.div
      animate={{ scale: [1, 1.04, 1] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      className="flex flex-col items-center"
    >
      <div className="text-[10px] uppercase tracking-[0.3em] text-gold/80 font-heading">Pot</div>
      <div className="font-mono text-3xl text-gold-light text-shadow-gold font-bold">
        {livePot.toLocaleString()}
      </div>
      <ChipStack amount={livePot} size="md" />
      {hand.pots.length > 1 && (hand.phase === 'showdown' || hand.phase === 'hand-complete') && (
        <div className="mt-2 flex flex-col gap-1 items-center">
          {hand.pots.map((pot, i) => (
            <div key={i} className="text-xs text-ivory/70">
              {i === 0 ? 'Main' : `Side ${i}`}: <span className="font-mono text-gold-light">{pot.amount}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
