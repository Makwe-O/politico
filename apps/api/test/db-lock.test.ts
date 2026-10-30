import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { openDb } from '../src/db/client';

describe('openDb data-dir lock', () => {
  const root = mkdtempSync(join(tmpdir(), 'politico-lock-'));
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it('refuses a second open of the same data dir until the first closes', async () => {
    const dir = join(root, 'db1');
    const first = await openDb(dir);
    await expect(openDb(dir, { lockTimeoutMs: 300 })).rejects.toThrow(/in use by process/);
    await first.$client.close();
    const second = await openDb(dir, { lockTimeoutMs: 300 });
    await second.$client.close();
  });

  it('reclaims a lock left behind by a dead process', async () => {
    const dir = join(root, 'db2');
    writeFileSync(`${dir}.lock`, '999999'); // no such pid
    const db = await openDb(dir, { lockTimeoutMs: 300 });
    await db.$client.close();
  });
});
