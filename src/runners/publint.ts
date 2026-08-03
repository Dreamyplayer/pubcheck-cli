import { publint } from 'publint';
import { formatMessage } from 'publint/utils';
import type { RunnerOptions, RunnerResult, Severity } from './types.js';

export interface PublintToolOptions {
  /** Minimum severity to report (default: "suggestion", i.e. everything). */
  level?: 'suggestion' | 'warning' | 'error';
  /** Treat warnings as errors. */
  strict?: boolean;
}

export async function runPublint({ cwd, toolOptions }: RunnerOptions): Promise<RunnerResult> {
  const opts = (toolOptions ?? {}) as PublintToolOptions;

  try {
    const { messages, pkg } = await publint({
      pkgDir: cwd,
      level: opts.level ?? 'suggestion',
      strict: opts.strict,
    });

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
