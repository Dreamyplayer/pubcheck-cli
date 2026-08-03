import { describe, expect, it } from 'vitest';
import { aggregate } from '../src/report/aggregate.js';
import type { RunnerResult } from '../src/runners/types.js';

function result(overrides: Partial<RunnerResult>): RunnerResult {
  return { tool: 'publint', pass: true, issues: [], ...overrides };
}

describe('aggregate', () => {
  it('passes when all runners pass', () => {
    const verdict = aggregate([
      result({ tool: 'publint', pass: true }),
      result({ tool: 'attw', pass: true }),
      result({ tool: 'knip', pass: true }),
    ]);
    expect(verdict.pass).toBe(true);
    expect(verdict.summary).toEqual({ publint: true, attw: true, knip: true });
  });

  it('fails when any single runner fails', () => {
    const verdict = aggregate([
      result({ tool: 'publint', pass: true }),
      result({ tool: 'attw', pass: false, issues: [{ severity: 'error', message: 'no types' }] }),
      result({ tool: 'knip', pass: true }),
    ]);
    expect(verdict.pass).toBe(false);
    expect(verdict.summary.attw).toBe(false);
    expect(verdict.errorCount).toBe(1);
  });

  it('treats a tool crash (runError) as a failure even if pass was true', () => {
    const verdict = aggregate([result({ tool: 'knip', pass: true, runError: 'ENOENT: npx not found' })]);
    expect(verdict.pass).toBe(false);
    expect(verdict.summary.knip).toBe(false);
  });

  it('counts issues by severity across all tools', () => {
    const verdict = aggregate([
      result({
        tool: 'publint',
        pass: false,
        issues: [
          { severity: 'error', message: 'a' },
          { severity: 'warning', message: 'b' },
          { severity: 'suggestion', message: 'c' },
        ],
      }),
    ]);
    expect(verdict.errorCount).toBe(1);
    expect(verdict.warningCount).toBe(1);
    expect(verdict.suggestionCount).toBe(1);
  });
});
