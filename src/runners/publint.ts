import { publint } from 'publint';
import { formatMessage } from 'publint/utils';
import type { RunnerOptions, RunnerResult, Severity } from './types.js';

export interface PublintToolOptions {
  /** Minimum severity to report (default: "suggestion", i.e. everything). */
  level?: 'suggestion' | 'warning' | 'error';
  /** Treat warnings as errors. */
  strict?: boolean;
  /**
   * Which package manager publint uses to pack pkgDir when determining
   * "would this file actually be published". Defaults to "npm" here
   * (NOT publint's own "auto" default) — regardless of what package
   * manager the *project* uses locally, `npm publish` is what actually
   * ships to the registry, so npm's pack semantics are what matter.
   *
   * This matters concretely: publint's "auto" mode detects a package
   * manager by walking up for a lockfile. If pkgDir sits nested inside
   * some other project's node_modules (e.g. `pubcheck ./node_modules/x`)
   * and that outer project has a yarn.lock, "auto" picks `yarn pack` —
   * which has a real bug packing nested node_modules targets and reports
   * every file as "not published" even though it plainly exists.
   * Forcing "npm" sidesteps that entirely.
   */
  pack?: 'auto' | 'npm' | 'yarn' | 'pnpm' | 'bun' | false;
}

export async function runPublint({ cwd, toolOptions }: RunnerOptions): Promise<RunnerResult> {
  const opts = (toolOptions ?? {}) as PublintToolOptions;

  try {
    const { messages, pkg } = await publint({
      pkgDir: cwd,
      level: opts.level ?? 'suggestion',
      strict: opts.strict,
      pack: opts.pack ?? 'npm',
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
