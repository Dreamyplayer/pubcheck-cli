import { Command } from 'commander';
import { resolve } from 'node:path';
import { runCheck } from './index.js';
import { renderJson } from './report/json.js';
import { renderTerminal } from './report/terminal.js';
import type { ToolName } from './runners/types.js';

const VALID_TOOLS: ToolName[] = ['publint', 'attw', 'knip'];

function parseSkip(value: string): ToolName[] {
  const tools = value.split(',').map(t => t.trim());
  for (const t of tools) {
    if (!VALID_TOOLS.includes(t as ToolName)) {
      throw new Error(`Unknown tool "${t}" — expected one of: ${VALID_TOOLS.join(', ')}`);
    }
  }
  return tools as ToolName[];
}

async function main() {
  const program = new Command()
    .name('pubcheck')
    .description('Run publint, arethetypeswrong, and Knip together — one combined pass/fail verdict.')
    .argument('[dir]', 'package directory to check', '.')
    .option('--json', 'output machine-readable JSON instead of the terminal report')
    .option('--verbose', 'show every issue, including suggestions')
    .option('--skip <tools>', 'comma-separated tools to skip (publint,attw,knip)', parseSkip)
    .version(process.env.PUBCHECK_VERSION ?? '0.1.0');

  program.parse();

  const opts = program.opts<{ json?: boolean; verbose?: boolean; skip?: ToolName[] }>();
  const dir = program.args[0] ?? '.';
  const cwd = resolve(process.cwd(), dir);

  const verdict = await runCheck({ cwd, skip: opts.skip });

  console.log(opts.json ? renderJson(verdict) : renderTerminal(verdict, { verbose: opts.verbose }));

  process.exitCode = verdict.pass ? 0 : 1;
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
