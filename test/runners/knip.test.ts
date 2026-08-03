import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('execa', () => ({ execa: vi.fn() }));

import { execa } from 'execa';
import { runKnip } from '../../src/runners/knip.js';

describe('runKnip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes when knip reports no issues', async () => {
    vi.mocked(execa).mockResolvedValue({ stdout: JSON.stringify({ issues: [] }) } as never);

    const result = await runKnip({ cwd: '/fake' });
    expect(result.pass).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('flattens per-file, per-issue-type entries into individual warnings', async () => {
    vi.mocked(execa).mockResolvedValue({
      stdout: JSON.stringify({
        issues: [
          { file: 'src/utils.ts', exports: [{ name: 'formatDate' }] },
          { file: 'package.json', dependencies: [{ name: 'lodash' }] },
        ],
      }),
    } as never);

    const result = await runKnip({ cwd: '/fake' });
    expect(result.pass).toBe(false);
    expect(result.issues).toEqual([
      { severity: 'warning', message: 'exports: formatDate', file: 'src/utils.ts' },
      { severity: 'warning', message: 'dependencies: lodash', file: 'package.json' },
    ]);
  });

  it("reports a runError instead of throwing when stdout isn't valid JSON (e.g. Knip itself crashed)", async () => {
    vi.mocked(execa).mockResolvedValue({ stdout: '' } as never);

    const result = await runKnip({ cwd: '/fake' });
    expect(result.pass).toBe(false);
    expect(result.runError).toBeDefined();
  });

  it("passes reject: false so a non-zero knip exit code isn't treated as a crash", async () => {
    vi.mocked(execa).mockResolvedValue({ stdout: JSON.stringify({ issues: [] }) } as never);

    await runKnip({ cwd: '/fake' });
    expect(execa).toHaveBeenCalledWith(
      'npx',
      expect.arrayContaining(['knip', '--reporter', 'json']),
      expect.objectContaining({ cwd: '/fake', reject: false }),
    );
  });

  it('appends extra args from toolOptions', async () => {
    vi.mocked(execa).mockResolvedValue({ stdout: JSON.stringify({ issues: [] }) } as never);

    await runKnip({ cwd: '/fake', toolOptions: { args: ['--config', 'knip.custom.json'] } });
    expect(execa).toHaveBeenCalledWith(
      'npx',
      expect.arrayContaining(['--config', 'knip.custom.json']),
      expect.anything(),
    );
  });
});
