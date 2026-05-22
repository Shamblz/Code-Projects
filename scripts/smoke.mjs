// End-to-end smoke test against running server.
// Connects 3 socket.io clients (host + 2 players), plays one hand to showdown,
// awards the pot, and verifies state along the way.
import { io } from 'socket.io-client';

const URL = process.env.URL || 'http://localhost:3000';

function makeClient() {
  return io(URL, { path: '/socket.io', transports: ['websocket'] });
}

function emitP(socket, event, payload) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout: ' + event)), 5000);
    const cb = (ack) => {
      clearTimeout(t);
      resolve(ack);
    };
    if (payload === undefined) socket.emit(event, cb);
    else socket.emit(event, payload, cb);
  });
}

function awaitState(socket, predicate) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('state timeout')), 5000);
    const onState = ({ game }) => {
      if (predicate(game)) {
        clearTimeout(t);
        socket.off('state:update', onState);
        resolve(game);
      }
    };
    socket.on('state:update', onState);
  });
}

function assert(cond, msg) {
  if (!cond) throw new Error('ASSERT: ' + msg);
  console.log('  ✓', msg);
}

async function main() {
  console.log('Connecting clients to', URL);
  const host = makeClient();
  const p1 = makeClient();
  const p2 = makeClient();

  await new Promise((r) => host.on('connect', r));
  await new Promise((r) => p1.on('connect', r));
  await new Promise((r) => p2.on('connect', r));

  console.log('Creating game…');
  const created = await emitP(host, 'game:create', {
    hostName: 'Athena',
    startingStack: 1000,
    smallBlind: 5,
    bigBlind: 10,
  });
  if (!created.ok) throw new Error('create failed: ' + created.error);
  console.log('  game code:', created.code);
  const hostId = created.playerId;

  console.log('p1 joining…');
  const j1 = await emitP(p1, 'game:join', { code: created.code, name: 'Bob' });
  if (!j1.ok) throw new Error('p1 join failed: ' + j1.error);

  console.log('p2 joining…');
  const j2 = await emitP(p2, 'game:join', { code: created.code, name: 'Carol' });
  if (!j2.ok) throw new Error('p2 join failed: ' + j2.error);

  const p1Id = j1.playerId;
  const p2Id = j2.playerId;

  console.log('Starting hand…');
  const handStart = awaitState(host, (g) => g.hand && g.hand.phase === 'preflop');
  host.emit('host:startHand');
  const preflop = await handStart;
  assert(preflop.hand.dealerSeat === 0, 'dealer is host (seat 0)');
  assert(preflop.hand.smallBlindSeat === 1, 'p1 is SB');
  assert(preflop.hand.bigBlindSeat === 2, 'p2 is BB');
  assert(preflop.hand.currentTurnSeat === 0, 'host acts first preflop');

  console.log('Preflop betting…');
  const flopState = awaitState(host, (g) => g.hand && g.hand.phase === 'flop');
  host.emit('action:call');
  await new Promise((r) => setTimeout(r, 50));
  p1.emit('action:call');
  await new Promise((r) => setTimeout(r, 50));
  p2.emit('action:check');
  const flop = await flopState;
  assert(flop.hand.phase === 'flop', 'advanced to flop');
  assert(flop.players.every((p) => p.currentBet === 0), 'currentBets reset');

  console.log('Check around flop…');
  const turnState = awaitState(host, (g) => g.hand && g.hand.phase === 'turn');
  p1.emit('action:check');
  await new Promise((r) => setTimeout(r, 30));
  p2.emit('action:check');
  await new Promise((r) => setTimeout(r, 30));
  host.emit('action:check');
  await turnState;
  console.log('  ✓ reached turn');

  const riverState = awaitState(host, (g) => g.hand && g.hand.phase === 'river');
  p1.emit('action:check');
  await new Promise((r) => setTimeout(r, 30));
  p2.emit('action:check');
  await new Promise((r) => setTimeout(r, 30));
  host.emit('action:check');
  await riverState;
  console.log('  ✓ reached river');

  const showdownState = awaitState(host, (g) => g.hand && g.hand.phase === 'showdown');
  p1.emit('action:check');
  await new Promise((r) => setTimeout(r, 30));
  p2.emit('action:check');
  await new Promise((r) => setTimeout(r, 30));
  host.emit('action:check');
  const showdown = await showdownState;
  assert(showdown.hand.phase === 'showdown', 'reached showdown');
  assert(showdown.hand.pots.length === 1, 'single pot at showdown');
  assert(showdown.hand.pots[0].amount === 30, 'pot is 30 (10 each)');

  console.log('Awarding pot to p1…');
  const handComplete = awaitState(host, (g) => g.hand && g.hand.phase === 'hand-complete');
  host.emit('showdown:declareWinners', { potIndex: 0, winnerIds: [p1Id] });
  const done = await handComplete;
  const p1Player = done.players.find((p) => p.id === p1Id);
  assert(p1Player.stack === 1020, `p1 stack = 1020 (was 990 after SB, won 30): got ${p1Player.stack}`);

  console.log('Starting next hand to verify dealer rotation…');
  const next = awaitState(host, (g) => g.hand && g.hand.phase === 'preflop' && g.hand.handNumber === 2);
  host.emit('host:startHand');
  const next2 = await next;
  assert(next2.hand.dealerSeat === 1, 'dealer rotated to seat 1');
  assert(next2.hand.smallBlindSeat === 2, 'SB rotated to seat 2');
  assert(next2.hand.bigBlindSeat === 0, 'BB rotated to seat 0 (host)');

  console.log('\n✅ Full-hand smoke test PASSED');
  host.close();
  p1.close();
  p2.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Smoke test failed:', err.message);
  process.exit(1);
});
