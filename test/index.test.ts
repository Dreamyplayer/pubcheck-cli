import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/config.js', () => ({ loadConfig: vi.fn() }));
vi.mock('../src/runners/publint.js', () => ({ runPublint: vi.fn() }));
vi.mock('../src/runners/attw.js', () => ({ runAttw: vi.fn() }));
vi.mock('../src/runners/knip.js', () => ({ runKnip: vi.fn() }));

import { loadConfig } from '../src/config.js';
import { runCheck } from '../src/index.js';
import { runAttw } from '../src/runners/attw.js';
import { runKnip } from '../src/runners/knip.js';
import { runPublint } from '../src/runners/publint.js';

function ok(tool: 'publint' | 'attw' | 'knip') {
  return { tool, pass: true, issues: [] };
}

describe('runCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadConfig).mockResolvedValue({});
  });

  it('runs all three tools by default and aggregates a passing verdict', async () => {
    vi.mocked(runPublint).mockResolvedValue(ok('publint'));
    vi.mocked(runAttw).mockResolvedValue(ok('attw'));
    vi.mocked(runKnip).mockResolvedValue(ok('knip'));

    const verdict = await runCheck({ cwd: '/fake' });

    expect(verdict.pass).toBe(true);
    expect(runPublint).toHaveBeenCalledTimes(1);
    expect(runAttw).toHaveBeenCalledTimes(1);
    expect(runKnip).toHaveBeenCalledTimes(1);
  });

  it("skips tools listed in the config file's skip list", async () => {
    vi.mocked(loadConfig).mockResolvedValue({ skip: ['attw'] });
    vi.mocked(runPublint).mockResolvedValue(ok('publint'));
    vi.mocked(runKnip).mockResolvedValue(ok('knip'));

    const verdict = await runCheck({ cwd: '/fake' });

    expect(runAttw).not.toHaveBeenCalled();
    expect(verdict.summary.attw).toBeUndefined();
    expect(verdict.results).toHaveLength(2);
  });

  it('merges options.skip (CLI/API) with config.skip', async () => {
    vi.mocked(loadConfig).mockResolvedValue({ skip: ['knip'] });
    vi.mocked(runPublint).mockResolvedValue(ok('publint'));

    await runCheck({ cwd: '/fake', skip: ['attw'] });

    expect(runAttw).not.toHaveBeenCalled();
    expect(runKnip).not.toHaveBeenCalled();
    expect(runPublint).toHaveBeenCalledTimes(1);
  });

  it('turns a rejected runner promise into a failing runError instead of throwing', async () => {
    vi.mocked(loadConfig).mockResolvedValue({ skip: ['attw', 'knip'] });
    vi.mocked(runPublint).mockRejectedValue(new Error('segfault'));

    const verdict = await runCheck({ cwd: '/fake' });

    expect(verdict.pass).toBe(false);
    expect(verdict.results[0]).toMatchObject({ tool: 'publint', runError: 'segfault' });
  });

  it("passes each tool's config.tools override through as toolOptions", async () => {
    const attwOptions = { entrypoints: ['.'] };
    vi.mocked(loadConfig).mockResolvedValue({ tools: { attw: attwOptions } });
    vi.mocked(runPublint).mockResolvedValue(ok('publint'));
    vi.mocked(runAttw).mockResolvedValue(ok('attw'));
    vi.mocked(runKnip).mockResolvedValue(ok('knip'));

    await runCheck({ cwd: '/fake' });

    expect(runAttw).toHaveBeenCalledWith(expect.objectContaining({ toolOptions: attwOptions }));
  });
});
