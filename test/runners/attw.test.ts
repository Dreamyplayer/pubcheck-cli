import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('execa', () => ({ execa: vi.fn() }));
vi.mock('node:fs/promises', () => ({
  mkdtemp: vi.fn(),
  readFile: vi.fn(),
  rm: vi.fn(),
}));
vi.mock('@arethetypeswrong/core', () => ({
  checkPackage: vi.fn(),
  createPackageFromTarballData: vi.fn(),
}));
vi.mock('@arethetypeswrong/core/problems', () => ({
  problemKindInfo: {
    NoResolution: { title: 'Resolution failure' },
    FalseCJS: { title: 'Masquerading as CJS' },
  },
}));

import { checkPackage, createPackageFromTarballData } from '@arethetypeswrong/core';
import { execa } from 'execa';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { runAttw } from '../../src/runners/attw.js';

describe('runAttw', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mkdtemp).mockResolvedValue('/tmp/pubcheck-attw-abc123');
    vi.mocked(execa).mockResolvedValue({
      stdout: JSON.stringify([{ filename: 'pubcheck-0.1.0.tgz' }]),
    } as never);
    vi.mocked(readFile).mockResolvedValue(Buffer.from('tarball-bytes'));
    vi.mocked(rm).mockResolvedValue(undefined);
    vi.mocked(createPackageFromTarballData).mockReturnValue({} as never);
  });

  it('passes when checkPackage reports no problems', async () => {
    vi.mocked(checkPackage).mockResolvedValue({
      types: { kind: 'included' },
      problems: [],
    } as never);

    const result = await runAttw({ cwd: '/fake' });
    expect(result.pass).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('fails and maps one issue per problem, using problemKindInfo for the message', async () => {
    vi.mocked(checkPackage).mockResolvedValue({
      types: { kind: 'included' },
      problems: [
        { kind: 'NoResolution', entrypoint: '.' },
        { kind: 'FalseCJS', typesFileName: 'dist/index.d.cts' },
      ],
    } as never);

    const result = await runAttw({ cwd: '/fake' });
    expect(result.pass).toBe(false);
    expect(result.issues).toEqual([
      { severity: 'error', message: 'Resolution failure (.)' },
      { severity: 'error', message: 'Masquerading as CJS (dist/index.d.cts)' },
    ]);
  });

  it('treats an untyped package (types: false) as a failure with an explanatory issue', async () => {
    vi.mocked(checkPackage).mockResolvedValue({ types: false } as never);

    const result = await runAttw({ cwd: '/fake' });
    expect(result.pass).toBe(false);
    expect(result.issues[0]?.message).toMatch(/no type declarations/i);
  });

  it("packs into an isolated temp dir via --pack-destination, never the project's own cwd", async () => {
    vi.mocked(checkPackage).mockResolvedValue({ types: { kind: 'included' }, problems: [] } as never);

    await runAttw({ cwd: '/fake/project' });

    expect(execa).toHaveBeenCalledWith('npm', ['pack', '--json', '--pack-destination', '/tmp/pubcheck-attw-abc123'], {
      cwd: '/fake/project',
    });
  });

  it('always cleans up the temp dir, even when checkPackage throws', async () => {
    vi.mocked(checkPackage).mockRejectedValue(new Error('boom'));

    const result = await runAttw({ cwd: '/fake' });
    expect(result.runError).toBe('boom');
    expect(rm).toHaveBeenCalledWith('/tmp/pubcheck-attw-abc123', { recursive: true, force: true });
  });

  it('forwards toolOptions (e.g. entrypoints) to checkPackage', async () => {
    vi.mocked(checkPackage).mockResolvedValue({ types: { kind: 'included' }, problems: [] } as never);

    await runAttw({ cwd: '/fake', toolOptions: { entrypoints: ['.'] } });
    expect(checkPackage).toHaveBeenCalledWith(expect.anything(), { entrypoints: ['.'] });
  });
});
