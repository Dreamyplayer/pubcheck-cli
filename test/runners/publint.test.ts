import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('publint', () => ({ publint: vi.fn() }));
vi.mock('publint/utils', () => ({ formatMessage: vi.fn() }));

import { publint } from 'publint';
import { formatMessage } from 'publint/utils';
import { runPublint } from '../../src/runners/publint.js';

describe('runPublint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes when there are no error-level messages', async () => {
    vi.mocked(publint).mockResolvedValue({
      messages: [{ type: 'suggestion', code: 'USE_SIDE_EFFECTS', args: {}, path: ['name'] }],
      pkg: { name: 'pubcheck' },
    } as never);
    vi.mocked(formatMessage).mockReturnValue('consider adding sideEffects');

    const result = await runPublint({ cwd: '/fake' });

    expect(result.pass).toBe(true);
    expect(result.issues).toEqual([{ severity: 'suggestion', message: 'consider adding sideEffects', file: 'name' }]);
  });

  it('fails when there is at least one error-level message', async () => {
    vi.mocked(publint).mockResolvedValue({
      messages: [{ type: 'error', code: 'FILE_DOES_NOT_EXIST', args: {}, path: ['exports'] }],
      pkg: {},
    } as never);
    vi.mocked(formatMessage).mockReturnValue('file does not exist');

    const result = await runPublint({ cwd: '/fake' });
    expect(result.pass).toBe(false);
  });

  it('falls back to the message code when formatMessage returns undefined', async () => {
    vi.mocked(publint).mockResolvedValue({
      messages: [{ type: 'warning', code: 'USE_TYPE', args: {}, path: [] }],
      pkg: {},
    } as never);
    vi.mocked(formatMessage).mockReturnValue(undefined);

    const result = await runPublint({ cwd: '/fake' });
    expect(result.issues[0]?.message).toBe('USE_TYPE');
    expect(result.issues[0]?.file).toBeUndefined();
  });

  it('passes the parsed pkg.json through to formatMessage for interpolation', async () => {
    const pkg = { name: 'pubcheck', exports: './index.js' };
    vi.mocked(publint).mockResolvedValue({
      messages: [{ type: 'warning', code: 'USE_TYPE', args: {}, path: [] }],
      pkg,
    } as never);
    vi.mocked(formatMessage).mockReturnValue('ok');

    await runPublint({ cwd: '/fake' });
    expect(formatMessage).toHaveBeenCalledWith(expect.anything(), pkg);
  });

  it('reports a runError instead of throwing when publint itself crashes', async () => {
    vi.mocked(publint).mockRejectedValue(new Error('no package.json found'));

    const result = await runPublint({ cwd: '/fake' });
    expect(result.pass).toBe(false);
    expect(result.runError).toBe('no package.json found');
  });

  it('defaults to level: suggestion but forwards an explicit level from toolOptions', async () => {
    vi.mocked(publint).mockResolvedValue({ messages: [], pkg: {} } as never);

    await runPublint({ cwd: '/fake', toolOptions: { level: 'error' } });
    expect(publint).toHaveBeenCalledWith(expect.objectContaining({ pkgDir: '/fake', level: 'error' }));
  });
});
