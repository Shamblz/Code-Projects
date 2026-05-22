'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getSocket } from '../client/socketSingleton';
import { rememberIdentity } from '../client/storage';
import type { Game } from '../game/types';

type Ack = { ok: true; code: string; playerId: string; game: Game } | { ok: false; error: string };

export default function LandingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="relative mb-8 flex flex-col items-center">
        <div className="text-xs uppercase tracking-[0.4em] text-gold/80 font-heading mb-2">Welcome to</div>
        <h1 className="font-display text-6xl sm:text-7xl text-gold text-shadow-gold leading-none">
          Athena<span className="text-ivory">·</span>Chips
        </h1>
        <div className="mt-3 text-sm uppercase tracking-[0.3em] text-ivory/70 font-heading">
          Texas Hold&apos;em · Chip Companion
        </div>
        <div className="gold-divider w-64 mt-5" />
      </div>

      {mode === 'menu' && (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button onClick={() => setMode('create')} className="btn-gold rounded-md py-4 text-base uppercase tracking-wider">
            Create Game
          </button>
          <button onClick={() => setMode('join')} className="btn-velvet rounded-md py-4 text-base uppercase tracking-wider">
            Join Game
          </button>
        </div>
      )}

      {mode === 'create' && <CreateGameForm onBack={() => setMode('menu')} onCreated={(code) => router.push(`/game/${code}`)} />}
      {mode === 'join' && <JoinGameForm onBack={() => setMode('menu')} onJoined={(code) => router.push(`/game/${code}`)} />}

      <p className="mt-12 text-center text-xs text-ivory/40 max-w-sm">
        Bring your own deck. Athena tracks chips, blinds, and pots — the rest of poker is up to you.
      </p>
    </main>
  );
}

function CreateGameForm({ onBack, onCreated }: { onBack: () => void; onCreated: (code: string) => void }) {
  const [hostName, setHostName] = useState('');
  const [startingStack, setStartingStack] = useState(1000);
  const [smallBlind, setSmallBlind] = useState(5);
  const [bigBlind, setBigBlind] = useState(10);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!hostName.trim()) { setErr('Enter your name'); return; }
    setBusy(true);
    const socket = getSocket();
    socket.emit(
      'game:create',
      { hostName: hostName.trim(), startingStack, smallBlind, bigBlind },
      (ack: Ack) => {
        setBusy(false);
        if (ack.ok) {
          rememberIdentity(ack.code, ack.playerId, hostName.trim());
          onCreated(ack.code);
        } else {
          setErr(ack.error);
        }
      },
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 w-full max-w-xs">
      <h2 className="font-heading text-2xl text-gold text-center">Create Game</h2>
      <label className="flex flex-col gap-1 text-sm text-ivory/80">
        Your name
        <input value={hostName} onChange={(e) => setHostName(e.target.value)} className="input-vegas" maxLength={20} required />
      </label>
      <label className="flex flex-col gap-1 text-sm text-ivory/80">
        Starting stack (per player)
        <input type="number" value={startingStack} onChange={(e) => setStartingStack(Math.max(20, parseInt(e.target.value) || 0))} className="input-vegas font-mono" min={20} step={10} required />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-ivory/80">
          Small blind
          <input type="number" value={smallBlind} onChange={(e) => setSmallBlind(Math.max(1, parseInt(e.target.value) || 1))} className="input-vegas font-mono" min={1} required />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ivory/80">
          Big blind
          <input type="number" value={bigBlind} onChange={(e) => setBigBlind(Math.max(2, parseInt(e.target.value) || 2))} className="input-vegas font-mono" min={2} required />
        </label>
      </div>
      {err && <div className="text-velvet-light text-sm text-center">{err}</div>}
      <button type="submit" disabled={busy} className="btn-gold rounded-md py-3 uppercase tracking-wider">
        {busy ? 'Dealing in…' : 'Deal Me In'}
      </button>
      <button type="button" onClick={onBack} className="text-ivory/60 text-sm">← Back</button>
    </form>
  );
}

function JoinGameForm({ onBack, onJoined }: { onBack: () => void; onJoined: (code: string) => void }) {
  const [code, setCode] = useState('');
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (code.trim()) onJoined(code.trim().toUpperCase()); }}
      className="flex flex-col gap-4 w-full max-w-xs"
    >
      <h2 className="font-heading text-2xl text-gold text-center">Join Game</h2>
      <label className="flex flex-col gap-1 text-sm text-ivory/80">
        Game code
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="input-vegas font-mono text-center text-2xl tracking-[0.5em]"
          maxLength={4}
          minLength={4}
          autoFocus
          required
        />
      </label>
      <button type="submit" className="btn-velvet rounded-md py-3 uppercase tracking-wider">
        Enter Table
      </button>
      <button type="button" onClick={onBack} className="text-ivory/60 text-sm">← Back</button>
    </form>
  );
}
