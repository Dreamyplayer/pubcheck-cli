import pc from 'picocolors';
import type { ToolName } from '../runners/types.js';
import type { Verdict } from './aggregate.js';

const TOOL_LABEL: Record<ToolName, string> = {
  publint: 'publint',
  attw: 'attw',
  knip: 'knip',
};

function statusIcon(pass: boolean): string {
  return pass ? pc.green('✔') : pc.red('✖');
}

function headline(verdict: Verdict): string {
  const parts = verdict.results.map(r => {
    const label = TOOL_LABEL[r.tool];
    const detail = r.pass ? '' : ` (${r.issues.length} issue${r.issues.length === 1 ? '' : 's'})`;
    return `${statusIcon(r.pass && !r.runError)} ${label}${detail}`;
  });
  return `${pc.bold('pubcheck')}  ${parts.join('   ')}`;
}

export function renderTerminal(verdict: Verdict, { verbose = false } = {}): string {
  const lines: string[] = [headline(verdict), ''];

  const verdictLine = verdict.pass ? pc.green(pc.bold('✔ PASS')) : pc.red(pc.bold('✖ FAIL'));
  lines.push(
    `${verdictLine} — ${verdict.errorCount} error${verdict.errorCount === 1 ? '' : 's'}, ${verdict.warningCount} warning${verdict.warningCount === 1 ? '' : 's'}`,
  );
  lines.push('');

  for (const result of verdict.results) {
    if (result.runError) {
      lines.push(pc.red(pc.bold(TOOL_LABEL[result.tool])));
      lines.push(pc.red(`  ✖ tool crashed: ${result.runError}`));
      lines.push('');
      continue;
    }

    const issuesToShow = verbose ? result.issues : result.issues.filter(i => i.severity !== 'suggestion');
    if (issuesToShow.length === 0) continue;

    lines.push(pc.bold(TOOL_LABEL[result.tool]));
    for (const issue of issuesToShow) {
      const icon =
        issue.severity === 'error' ? pc.red('✖') : issue.severity === 'warning' ? pc.yellow('✖') : pc.dim('·');
      const location = issue.file ? pc.dim(` (${issue.file})`) : '';
      lines.push(`  ${icon} ${issue.message}${location}`);
    }
    lines.push('');
  }

  if (!verbose && verdict.suggestionCount > 0) {
    lines.push(
      pc.dim(`${verdict.suggestionCount} suggestion(s) hidden — run with --verbose for full output per tool.`),
    );
  }

  return lines.join('\n');
}
