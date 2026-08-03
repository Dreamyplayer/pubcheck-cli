import type { RunnerResult, ToolName } from '../runners/types.js';

export interface Verdict {
  pass: boolean;
  summary: Record<ToolName, boolean>;
  results: RunnerResult[];
  errorCount: number;
  warningCount: number;
  suggestionCount: number;
}

export function aggregate(results: RunnerResult[]): Verdict {
  const allIssues = results.flatMap(r => r.issues);

  const summary = Object.fromEntries(results.map(r => [r.tool, r.pass && !r.runError])) as Record<ToolName, boolean>;

  return {
    pass: results.every(r => r.pass && !r.runError),
    summary,
    results,
    errorCount: allIssues.filter(i => i.severity === 'error').length,
    warningCount: allIssues.filter(i => i.severity === 'warning').length,
    suggestionCount: allIssues.filter(i => i.severity === 'suggestion').length,
  };
}
