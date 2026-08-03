import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

let dir: string;

afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
});

describe('loadConfig', () => {
  it('reads config from the pubcheck field in package.json', async () => {
    dir = mkdtempSync(join(tmpdir(), 'pubcheck-test-'));
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'fixture', pubcheck: { skip: ['attw'] } }));

    const config = await loadConfig(dir);
    expect(config.skip).toEqual(['attw']);
  });

  it('reads config from a .pubcheckrc.json file', async () => {
    dir = mkdtempSync(join(tmpdir(), 'pubcheck-test-'));
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'fixture' }));
    writeFileSync(join(dir, '.pubcheckrc.json'), JSON.stringify({ skip: ['knip'] }));

    const config = await loadConfig(dir);
    expect(config.skip).toEqual(['knip']);
  });

  it('returns an empty config when nothing is found', async () => {
    dir = mkdtempSync(join(tmpdir(), 'pubcheck-test-'));
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'fixture' }));

    const config = await loadConfig(dir);
    expect(config).toEqual({});
  });
});
