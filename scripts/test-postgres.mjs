import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir, userInfo } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
const directory = mkdtempSync(join(tmpdir(), 'scream-pg-'));
const socket = createServer();
await new Promise((r) => socket.listen(0, '127.0.0.1', r));
const port = socket.address().port;
await new Promise((r) => socket.close(r));
let started = false;
try {
  execFileSync('initdb', ['-D', directory, '-A', 'trust', '--no-locale'], {
    stdio: 'ignore',
  });
  execFileSync(
    'pg_ctl',
    [
      '-D',
      directory,
      '-l',
      join(directory, 'server.log'),
      '-o',
      `-h 127.0.0.1 -p ${port} -k ${directory}`,
      '-w',
      'start',
    ],
    { stdio: 'ignore' },
  );
  started = true;
  execFileSync(
    'createdb',
    ['-h', '127.0.0.1', '-p', String(port), 'scream_validation'],
    { stdio: 'inherit' },
  );
  execFileSync(
    'npx',
    [
      'vitest',
      'run',
      'tests/postgres.test.ts',
      'tests/hollow-postgres.test.ts',
    ],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        SCREAM_TEST_DATABASE_URL: `postgres://${userInfo().username}@127.0.0.1:${port}/scream_validation`,
      },
    },
  );
} finally {
  if (started)
    execFileSync('pg_ctl', ['-D', directory, '-m', 'fast', '-w', 'stop'], {
      stdio: 'ignore',
    });
  rmSync(directory, { recursive: true, force: true });
}
