'use client';
import { motion } from 'framer-motion';
import type { Hand, Player } from '../game/types';
import { ChipStack } from './ChipStack';

interface SeatProps {
  player: Player;
  isYou: boolean;
  isHost: boolean;
  hand: Hand | null;
  isWinner?: boolean;
}

export function Seat({ player, isYou, isHost, hand, isWinner }: SeatProps) {
  const isTurn = hand && hand.currentTurnSeat === player.seat;
  const isDealer = hand && hand.dealerSeat === player.seat;
  const isSB = hand && hand.smallBlindSeat === player.seat;
  const isBB = hand && hand.bigBlindSeat === player.seat;

  return (
    <motion.div
      animate={isWinner ? { scale: [1, 1.08, 1] } : {}}
      transition={{ duration: 1.2, repeat: isWinner ? Infinity : 0 }}
      className={`relative flex flex-col items-center px-2 py-2 rounded-xl backdrop-blur-sm transition-all
        ${isTurn ? 'bg-gold/20 ring-2 ring-gold shadow-gold-glow' : 'bg-black/40 ring-1 ring-ivory/10'}
        ${player.status === 'folded' ? 'opacity-50 grayscale' : ''}
        ${player.status === 'busted' ? 'opacity-30 line-through' : ''}
        ${isWinner ? 'ring-2 ring-gold-light' : ''}
      `}
      style={{ minWidth: '88px' }}
    >
      <div className="flex items-center gap-1 mb-1">
        {isDealer && <Badge label="D" color="bg-ivory text-felt-dark" />}
        {isSB && <Badge label="SB" color="bg-velvet text-ivory" />}
        {isBB && <Badge label="BB" color="bg-gold text-felt-dark" />}
        {isHost && <Badge label="♛" color="bg-gold-dark text-ivory" />}
      </div>
      <div className={`font-heading text-sm leading-tight truncate max-w-[88px] text-center ${isYou ? 'text-gold' : 'text-ivory'}`}>
        {player.name}{isYou && ' (you)'}
      </div>
      <div className="font-mono text-base text-gold-light">{player.stack.toLocaleString()}</div>
      {player.currentBet > 0 && (
        <div className="absolute -bottom-7 flex items-center gap-1">
          <ChipStack amount={player.currentBet} size="sm" />
          <span className="font-mono text-xs text-ivory/80">{player.currentBet}</span>
        </div>
      )}
      {player.status === 'all-in' && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-velvet text-ivory text-[10px] uppercase tracking-wider rounded">
          All-in
        </div>
      )}
      {player.status === 'folded' && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/70 text-ivory/70 text-[10px] uppercase tracking-wider rounded">
          Folded
        </div>
      )}
      {player.status === 'busted' && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/80 text-velvet-light text-[10px] uppercase tracking-wider rounded">
          Busted
        </div>
      )}
      {!player.connected && (
        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" title="disconnected" />
      )}
    </motion.div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-block min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-[18px] text-center ${color}`}>
      {label}
    </span>
  );
}
