export type Severity = 'error' | 'warning' | 'suggestion';

export type ToolName = 'publint' | 'attw' | 'knip';

export interface Issue {
  severity: Severity;
  /** Human-readable message, already formatted for display. */
  message: string;
  /** File the issue applies to, if the underlying tool reports one. */
  file?: string;
}

export interface RunnerResult {
  tool: ToolName;
  pass: boolean;
  issues: Issue[];
  /** Set when the tool itself failed to run (crash, bad config, etc). */
  runError?: string;
}

export interface RunnerOptions {
  /** Absolute path to the package directory being checked. */
  cwd: string;
  /** Per-tool config overrides read from pubcheck.config.ts / package.json. */
  toolOptions?: Record<string, unknown>;
}

export type Runner = (options: RunnerOptions) => Promise<RunnerResult>;
