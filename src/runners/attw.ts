import { checkPackage, createPackageFromTarballData, type CheckPackageOptions } from '@arethetypeswrong/core';
import { problemKindInfo } from '@arethetypeswrong/core/problems';
import { execa } from 'execa';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RunnerOptions, RunnerResult } from './types.js';

export type AttwToolOptions = CheckPackageOptions;

/**
 * attw's core API inspects a packed tarball, not a raw directory — this
 * mirrors what `npm publish` would actually ship, catching issues that only
 * show up after `files`/`.npmignore` filtering.
 *
 * NOTE: @arethetypeswrong/core is still v0 and its README explicitly warns
 * the API "may change significantly in patch and minor releases." Pin the
 * exact version in package.json (no `^`) and re-verify this file on every
 * bump — don't let it float.
 *
 * The tarball is packed into a fresh temp directory, never the project's
 * own cwd. pubcheck runs publint/attw/knip concurrently (Promise.allSettled
 * in index.ts) — a real (non-dry-run) `npm pack` writing its .tgz straight
 * into cwd would race with publint's own directory scan happening at the
 * same instant, and leaves an artifact behind in the user's project if
 * cleanup ever fails (e.g. a transient Windows file lock). Packing to an
 * isolated temp dir removes both problems: no shared file to race on, and
 * a failed cleanup only leaves garbage in the OS temp dir, not the repo.
 */
export async function runAttw({ cwd, toolOptions }: RunnerOptions): Promise<RunnerResult> {
  const opts = (toolOptions ?? {}) as AttwToolOptions;
  let tmpDir: string | undefined;

  try {
    tmpDir = await mkdtemp(join(tmpdir(), 'pubcheck-attw-'));

    const { stdout } = await execa('npm', ['pack', '--json', '--pack-destination', tmpDir], { cwd });
    const [{ filename }] = JSON.parse(stdout) as [{ filename: string }];
    const tarballPath = join(tmpDir, filename);

    const tarballData = await readFile(tarballPath);
    // Synchronous — createPackageFromTarballData returns a Package, not a Promise.
    const pkg = createPackageFromTarballData(tarballData);
    const result = await checkPackage(pkg, opts);

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
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
