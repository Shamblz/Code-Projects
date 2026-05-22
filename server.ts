import { createServer } from 'http';
import next from 'next';
import { Server as IOServer } from 'socket.io';
import { attachSocketHandlers } from './src/server/socket';
import { gcStaleGames } from './src/server/store';

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';

async function main() {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();
  await app.prepare();

  const httpServer = createServer((req, res) => {
    handle(req, res).catch((err) => {
      console.error('Request error:', err);
      res.statusCode = 500;
      res.end('internal error');
    });
  });

  const io = new IOServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    path: '/socket.io',
  });
  attachSocketHandlers(io);

  // GC stale games every hour
  setInterval(() => {
    const removed = gcStaleGames();
    if (removed > 0) console.log(`[gc] removed ${removed} stale games`);
  }, 60 * 60 * 1000);

  httpServer.listen(port, hostname, () => {
    console.log(`> Athena Chips ready on http://${hostname}:${port}`);
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
