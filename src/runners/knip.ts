import { execa } from 'execa';
import type { Issue, RunnerOptions, RunnerResult } from './types.js';

interface KnipJsonIssueEntry {
  file: string;
  [issueType: string]: unknown;
}

interface KnipJsonReport {
  issues: KnipJsonIssueEntry[];
}

/**
 * Knip ships a `main()` programmatic export, but it mutates process.cwd
 * and console, and its internal shape churns across minors. The JSON CLI
 * reporter is the one output format Knip documents as a stable contract —
 * shell out to it instead of embedding.
 */
export async function runKnip({ cwd }: RunnerOptions): Promise<RunnerResult> {
  try {
    const { stdout } = await execa('npx', ['knip', '--reporter', 'json', '--no-exit-code', '--no-progress'], {
      cwd,
      reject: false,
    });

    const report = JSON.parse(stdout) as KnipJsonReport;
    const issues: Issue[] = report.issues.flatMap(entry =>
      Object.entries(entry)
        .filter(([key, value]) => key !== 'file' && Array.isArray(value) && value.length > 0)
        .flatMap(([issueType, value]) =>
          (value as Array<{ name?: string; symbol?: string }>).map(item => ({
            severity: 'warning' as const,
            message: `${issueType}: ${item.name ?? item.symbol ?? 'unknown'}`,
            file: entry.file,
          })),
        ),
    );

    return { tool: 'knip', pass: issues.length === 0, issues };
  } catch (err) {
    return {
      tool: 'knip',
      pass: false,
      issues: [],
      runError: err instanceof Error ? err.message : String(err),
    };
  }
}
