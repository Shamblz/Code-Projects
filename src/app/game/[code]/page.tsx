'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ActionBar } from '../../../components/ActionBar';
import { ActionLog } from '../../../components/ActionLog';
import { HostControls } from '../../../components/HostControls';
import { Lobby } from '../../../components/Lobby';
import { ShowdownPanel } from '../../../components/ShowdownPanel';
import { Table } from '../../../components/Table';
import { useGameSocket } from '../../../client/useGameSocket';

export default function GamePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params.code?.toUpperCase() ?? null;
  const {
    game, playerId, connected, error, joinState, joinAsNew, lastWinnings, clearLastWinnings,
    clearError, emit,
  } = useGameSocket(code);

  const [name, setName] = useState('');
  const me = useMemo(() => game?.players.find((p) => p.id === playerId) ?? null, [game, playerId]);
  const isHost = !!(game && playerId && game.hostId === playerId);

  useEffect(() => {
    if (!lastWinnings) return;
    const t = setTimeout(() => clearLastWinnings(), 4000);
    return () => clearTimeout(t);
  }, [lastWinnings, clearLastWinnings]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => clearError(), 3500);
    return () => clearTimeout(t);
  }, [error, clearError]);

  if (!code) return null;

  if (joinState === 'not-found') {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="font-display text-4xl text-velvet-light mb-2">Game Not Found</div>
        <div className="text-ivory/70 mb-6">No game with code {code}</div>
        <button onClick={() => router.push('/')} className="btn-gold rounded px-6 py-3">Back to Lobby</button>
      </main>
    );
  }

  if (joinState === 'needs-name' || (joinState === 'idle' && connected && !game)) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="text-xs uppercase tracking-[0.3em] text-gold/80 font-heading">Joining</div>
        <div className="font-display text-6xl text-gold text-shadow-gold mb-6">{code}</div>
        <form
          onSubmit={(e) => { e.preventDefault(); if (name.trim()) joinAsNew(name.trim()); }}
          className="flex flex-col gap-3 w-full max-w-xs"
        >
          <label className="flex flex-col gap-1 text-sm text-ivory/80">
            Your name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-vegas"
              autoFocus
              maxLength={20}
              required
            />
          </label>
          <button type="submit" className="btn-gold rounded py-3 uppercase tracking-wider">Take a Seat</button>
        </form>
        {error && <div className="mt-3 text-velvet-light text-sm">{error}</div>}
      </main>
    );
  }

  if (!game) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen">
        <div className="font-display text-3xl text-gold animate-pulse">Shuffling…</div>
      </main>
    );
  }

  const inLobby = !game.hand || game.hand.phase === 'lobby';

  if (inLobby) {
    return (
      <>
        <Lobby
          game={game}
          isHost={isHost}
          onStart={() => emit('host:startHand')}
        />
        <ErrorToast error={error} />
      </>
    );
  }

  const winnerIds = new Set((lastWinnings ?? []).map((w) => w.playerId));

  return (
    <main className="min-h-screen relative pb-20">
      <Header game={game} connected={connected} isHost={isHost}
        onStartHand={() => emit('host:startHand')}
        onRebuy={(pid, amt) => emit('host:rebuy', { playerId: pid, amount: amt })}
        onKick={(pid) => emit('host:kick', { playerId: pid })}
      />
      <Table game={game} myPlayerId={playerId} winnerIds={winnerIds} />
      {game.hand && game.hand.phase === 'showdown' && (
        <ShowdownPanel
          game={game}
          isHost={isHost}
          onAward={(potIndex, winnerIds) => emit('showdown:declareWinners', { potIndex, winnerIds })}
        />
      )}
      {game.hand && game.hand.phase === 'hand-complete' && lastWinnings && (
        <HandCompleteBanner winnings={lastWinnings} game={game} />
      )}
      {me && game.hand && (game.hand.phase === 'preflop' || game.hand.phase === 'flop' || game.hand.phase === 'turn' || game.hand.phase === 'river') && (
        <ActionBar
          game={game}
          me={me}
          onFold={() => emit('action:fold')}
          onCheck={() => emit('action:check')}
          onCall={() => emit('action:call')}
          onRaise={(total) => emit('action:raise', { totalAmount: total })}
          onAllIn={() => emit('action:allIn')}
        />
      )}
      <ActionLog actions={game.hand?.actions ?? []} />
      <ErrorToast error={error} />
    </main>
  );
}

function Header({
  game, connected, isHost, onStartHand, onRebuy, onKick,
}: {
  game: ReturnType<typeof useGameSocket>['game']; connected: boolean; isHost: boolean;
  onStartHand: () => void; onRebuy: (id: string, amt: number) => void; onKick: (id: string) => void;
}) {
  if (!game) return null;
  return (
    <div className="flex items-center justify-between px-3 py-2 sticky top-0 z-30 bg-black/70 backdrop-blur border-b border-gold/30">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-500'}`} />
        <span className="font-display text-lg text-gold">Athena Chips</span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="font-mono text-ivory/60">{game.code}</span>
        <span className="text-ivory/40">·</span>
        <span className="font-mono text-ivory/60">SB/BB {game.smallBlind}/{game.bigBlind}</span>
        {game.hand && (
          <>
            <span className="text-ivory/40">·</span>
            <span className="font-heading uppercase text-gold/80">{game.hand.phase}</span>
          </>
        )}
      </div>
      {isHost && (
        <div className="flex items-center gap-2">
          <HostControls game={game} onStartHand={onStartHand} onRebuy={onRebuy} onKick={onKick} />
        </div>
      )}
    </div>
  );
}

function HandCompleteBanner({ winnings, game }: { winnings: Array<{ playerId: string; amount: number }>; game: ReturnType<typeof useGameSocket>['game'] }) {
  if (!game) return null;
  return (
    <div className="absolute top-16 inset-x-0 z-10 flex justify-center pointer-events-none">
      <div className="bg-gold/20 border-2 border-gold rounded-xl px-5 py-3 backdrop-blur-sm animate-gold-shimmer pointer-events-auto">
        <div className="text-[10px] uppercase tracking-[0.3em] text-gold-light font-heading text-center">Hand Complete</div>
        <div className="mt-1 flex flex-col items-center gap-0.5">
          {winnings.map((w) => {
            const p = game.players.find((x) => x.id === w.playerId);
            return (
              <div key={w.playerId} className="font-heading text-ivory">
                <span className="text-gold-light">{p?.name ?? '?'}</span> wins <span className="font-mono text-gold-light">{w.amount.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ErrorToast({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div className="fixed bottom-24 inset-x-0 z-50 flex justify-center pointer-events-none">
      <div className="bg-velvet text-ivory px-4 py-2 rounded-md text-sm shadow-lg border border-velvet-light">
        {error}
      </div>
    </div>
  );
}
