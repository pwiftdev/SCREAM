import type {
  IncomingMessage,
  Server as HttpServer,
  ServerResponse,
} from 'node:http';
import { H } from '../shared/config';
import { RateLimit } from './rate-limit';
/**
 * Behind a proxy (Heroku) every connection comes from the router, so the real client
 * is the last address the router itself appended to X-Forwarded-For. Only trusted
 * when the server is told it sits behind one: otherwise the header is client-controlled.
 */
export function clientIp(req: IncomingMessage, behindProxy: boolean) {
  const forwarded = req.headers['x-forwarded-for'];
  if (behindProxy && typeof forwarded === 'string') {
    const last = forwarded.split(',').pop()?.trim();
    if (last) return last;
  }
  return req.socket.remoteAddress ?? 'unknown';
}
export function guardHttp(
  server: HttpServer,
  origins: string[],
  behindProxy = process.env.TRUST_PROXY === '1',
) {
  const requests = new Map<string, { limiter: RateLimit; last: number }>();
  const listeners = server.listeners('request') as ((
    req: IncomingMessage,
    res: ServerResponse,
  ) => void)[];
  server.removeAllListeners('request');
  server.on('request', (req, res) => {
    const origin = req.headers.origin;
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    function reject(status: number, error: string) {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error }));
    }
    if (origin && !origins.includes(origin)) {
      reject(403, 'Origin not allowed');
      return;
    }
    if (
      Number(req.headers['content-length'] ?? 0) >
        (req.url?.startsWith('/api/hollow/') ? H.RUN_BYTES : 4096) ||
      req.headers['transfer-encoding']
    ) {
      reject(413, 'Request is too large');
      return;
    }
    if (req.url?.startsWith('/matchmake') || req.url?.startsWith('/api/')) {
      const ip = clientIp(req, behindProxy),
        now = Date.now();
      let entry = requests.get(ip);
      if (!entry) {
        if (requests.size >= 10000) {
          reject(503, 'Server busy');
          return;
        }
        entry = {
          limiter: new RateLimit(
            process.env.NODE_ENV === 'production' ? 24 : 512,
            process.env.NODE_ENV === 'production' ? 1 : 50,
          ),
          last: now,
        };
        requests.set(ip, entry);
      }
      entry.last = now;
      if (!entry.limiter.take(now)) {
        reject(429, 'Too many requests. Try again shortly.');
        return;
      }
    }
    for (const listener of listeners) listener.call(server, req, res);
  });
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of requests)
      if (now - entry.last > 120000) requests.delete(ip);
  }, 60000);
  cleanup.unref();
  server.once('close', () => clearInterval(cleanup));
}
