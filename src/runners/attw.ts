import { checkPackage, createPackageFromTarballData } from '@arethetypeswrong/core';
import { problemKindInfo } from '@arethetypeswrong/core/problems';
import { execa } from 'execa';
import { readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import type { RunnerOptions, RunnerResult } from './types.js';

/**
 * attw's core API inspects a packed tarball, not a raw directory — this
 * mirrors what `npm publish` would actually ship, catching issues that only
 * show up after `files`/`.npmignore` filtering.
 *
 * NOTE: @arethetypeswrong/core is still v0 and its README explicitly warns
 * the API "may change significantly in patch and minor releases." Pin the
 * exact version in package.json (no `^`) and re-verify this file on every
 * bump — don't let it float.
 */
export async function runAttw({ cwd }: RunnerOptions): Promise<RunnerResult> {
  let tarballPath: string | undefined;

  try {
    const { stdout } = await execa('npm', ['pack', '--json'], { cwd });
    const [{ filename }] = JSON.parse(stdout) as [{ filename: string }];
    tarballPath = join(cwd, filename);

    const tarballData = await readFile(tarballPath);
    // Synchronous — createPackageFromTarballData returns a Package, not a Promise.
    const pkg = createPackageFromTarballData(tarballData);
    const result = await checkPackage(pkg);

    // CheckResult = Analysis | UntypedResult. A package with no types at all
    // has no `problems` array — that absence *is* the finding.
    if (result.types === false) {
      return {
        tool: 'attw',
        pass: false,
        issues: [{ severity: 'error', message: 'Package has no type declarations' }],
      };
    }

    return {
      tool: 'attw',
      pass: result.problems.length === 0,
      issues: result.problems.map(p => {
        const info = problemKindInfo[p.kind];
        const location = 'entrypoint' in p ? p.entrypoint : 'typesFileName' in p ? p.typesFileName : undefined;
        return {
          severity: 'error',
          message: `${info?.title ?? p.kind}${location ? ` (${location})` : ''}`,
        };
      }),
    };
  } catch (err) {
    return {
      tool: 'attw',
      pass: false,
      issues: [],
      runError: err instanceof Error ? err.message : String(err),
    };
  } finally {
    if (tarballPath) await unlink(tarballPath).catch(() => {});
  }
}
