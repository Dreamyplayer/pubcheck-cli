import { publint } from 'publint';
import { formatMessage } from 'publint/utils';
import type { RunnerOptions, RunnerResult, Severity } from './types.js';

export async function runPublint({ cwd }: RunnerOptions): Promise<RunnerResult> {
  try {
    const { messages, pkg } = await publint({ pkgDir: cwd, level: 'suggestion' });

    return {
      tool: 'publint',
      pass: !messages.some(m => m.type === 'error'),
      issues: messages.map(m => ({
        severity: m.type as Severity,
        // formatMessage needs the parsed package.json to interpolate the message
        message: formatMessage(m, pkg) ?? m.code,
        file: m.path.length > 0 ? m.path.join('.') : undefined,
      })),
    };
  } catch (err) {
    return {
      tool: 'publint',
      pass: false,
      issues: [],
      runError: err instanceof Error ? err.message : String(err),
    };
  }
}
