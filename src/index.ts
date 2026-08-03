import { loadConfig } from './config.js';
import { aggregate, type Verdict } from './report/aggregate.js';
import { runAttw } from './runners/attw.js';
import { runKnip } from './runners/knip.js';
import { runPublint } from './runners/publint.js';
import type { Runner, RunnerResult, ToolName } from './runners/types.js';

export type { PubcheckConfig } from './config.js';
export type { Verdict } from './report/aggregate.js';
export type { AttwToolOptions } from './runners/attw.js';
export type { KnipToolOptions } from './runners/knip.js';
export type { PublintToolOptions } from './runners/publint.js';
export type { Issue, RunnerResult, Severity, ToolName } from './runners/types.js';

const RUNNERS: Record<ToolName, Runner> = {
  publint: runPublint,
  attw: runAttw,
  knip: runKnip,
};

export interface CheckOptions {
  /** Package directory to check. Defaults to process.cwd(). */
  cwd?: string;
  /** Tools to skip, overriding config file settings. */
  skip?: ToolName[];
}

export async function runCheck(options: CheckOptions = {}): Promise<Verdict> {
  const cwd = options.cwd ?? process.cwd();
  const config = await loadConfig(cwd);
  const skip = new Set([...(config.skip ?? []), ...(options.skip ?? [])]);

  const toolsToRun = (Object.keys(RUNNERS) as ToolName[]).filter(tool => !skip.has(tool));

  const settled = await Promise.allSettled(
    toolsToRun.map(tool => RUNNERS[tool]({ cwd, toolOptions: config.tools?.[tool] })),
  );

  const results: RunnerResult[] = settled.map((outcome, i) => {
    const tool = toolsToRun[i]!;
    if (outcome.status === 'fulfilled') return outcome.value;
    return {
      tool,
      pass: false,
      issues: [],
      runError: outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason),
    };
  });

  return aggregate(results);
}
