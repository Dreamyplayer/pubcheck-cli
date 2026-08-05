# pubcheck

[![npm version](https://img.shields.io/npm/v/pubcheck-cli.svg)](https://www.npmjs.com/package/pubcheck-cli)
[![npm downloads](https://img.shields.io/npm/dm/pubcheck-cli.svg)](https://www.npmjs.com/package/pubcheck-cli)
[![license](https://img.shields.io/npm/l/pubcheck-cli.svg)](https://github.com/Dreamyplayer/pubcheck-cli/blob/main/LICENSE)
[![node](https://img.shields.io/node/v/pubcheck-cli.svg)](https://www.npmjs.com/package/pubcheck-cli)

**One combined pass/fail verdict from [`publint`](https://publint.dev), [`arethetypeswrong`](https://arethetypeswrong.github.io) (attw), and [`Knip`](https://knip.dev)** — instead of running all three separately and reconciling three different outputs by hand.

```
pubcheck  ✔ publint   ✔ attw   ✖ knip (3 issues)

✖ FAIL — 0 errors, 3 warnings

knip
  ✖ unused-exports: formatDate (src/utils.ts)
  ✖ unused-exports: Config (src/types.ts)
  ✖ unused-dependencies: lodash
```

> Published on npm as `pubcheck-cli` — the plain `pubcheck` name was already taken by an unrelated package. The CLI command itself is still `pubcheck`.

## Why

Every one of these tools catches something the other two miss before you `npm publish` — and none of them catches what the other two do:

| Tool        | Catches                                                                                                              | Misses                                                       |
| ----------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **publint** | Broken `exports`/`main`/`module`/`types` fields, ESM/CJS mismatches                                                  | Whether your _types_ actually resolve correctly, unused code |
| **attw**    | Type declarations that don't resolve the way your published code does, across `node10`/`node16`/`bundler` resolution | package.json field correctness, unused code                  |
| **Knip**    | Unused files, exports, and dependencies you're shipping (or forgot to ship)                                          | Type/export-map correctness                                  |

Running all three separately means three commands, three install steps, three output formats to reconcile in your head — every time, on every release. `pubcheck` runs them together, in parallel, and gives you one verdict and one exit code.

## Install

```sh
yarn add -D pubcheck-cli
# or: npm install -D pubcheck-cli
```

## Usage

```sh
# check the current directory
npx pubcheck

# check a specific package (e.g. one package in a monorepo)
npx pubcheck ./packages/my-lib

# machine-readable output for CI
npx pubcheck --json

# show every issue, including low-severity suggestions
npx pubcheck --verbose

# skip a tool (e.g. no TypeScript types to check)
npx pubcheck --skip attw
```

Exit code is `0` when everything passes, `1` otherwise — drop it straight into CI or a `prepublishOnly` script:

```json
{
  "scripts": {
    "prepublishOnly": "pubcheck"
  }
}
```

## Configuration

`pubcheck` looks for config in (in order): the `pubcheck` field in `package.json`, `pubcheck.config.ts`, `pubcheck.config.js`, `.pubcheckrc`.

```ts
// pubcheck.config.ts
import type { PubcheckConfig } from 'pubcheck-cli';

export default {
  skip: ['attw'], // e.g. for a package with no type declarations
  tools: {
    publint: { level: 'warning' }, // ignore suggestions, only fail on warning/error
    knip: { args: ['--config', 'knip.custom.json'] },
  },
} satisfies PubcheckConfig;
```

## Programmatic API

```ts
import { runCheck } from 'pubcheck-cli';

const verdict = await runCheck({ cwd: './packages/my-lib' });

if (!verdict.pass) {
  console.log(verdict.summary); // { publint: true, attw: false, knip: true }
  process.exit(1);
}
```

`Verdict` shape:

```ts
interface Verdict {
  pass: boolean;
  summary: { publint: boolean; attw: boolean; knip: boolean };
  results: RunnerResult[]; // full per-tool detail, including individual issues
  errorCount: number;
  warningCount: number;
  suggestionCount: number;
}
```

## How each tool is invoked

- **publint** — called programmatically (`publint({ pkgDir })`); it's a pure function with a stable API. `pack` is forced to `"npm"` rather than publint's own `"auto"` detection — `"auto"` picks a package manager by walking up for a lockfile, and if `pkgDir` sits nested inside another project's `node_modules` (e.g. `pubcheck ./node_modules/some-pkg`) with a `yarn.lock` in that outer project, `"auto"` picks `yarn pack`, which has a real bug on nested `node_modules` targets — it reports every declared file as "not published" even though it plainly exists. `npm publish` is what actually ships to the registry regardless of what package manager a project's author uses locally, so forcing `"npm"` is correct generally, not just a workaround. Override via `tools.publint.pack` if you need to.
- **attw** — called programmatically against a real `npm pack` tarball (via `@arethetypeswrong/core`), packed into an isolated temp directory (never your project's own folder) so it sees exactly what would ship, after `files`/`.npmignore` filtering, without racing any other check running in parallel. `@arethetypeswrong/core` is still pre-1.0 and its README warns the API can change between minors — the dependency is pinned to an exact version rather than a caret range.
- **Knip** — shelled out to (`npx knip --reporter json --no-exit-code`), not embedded. Knip's `main()` export exists but mutates `process.cwd`/`console` and its internal shape isn't guaranteed stable across minors; the JSON reporter is the one contract Knip documents as stable.

**Note:** `pubcheck` is meant to run against your own source checkout before publishing — not against an already-installed `node_modules` copy. Knip in particular needs source code to prove a dependency is used; pointed at a trimmed, already-published package (no `src/`, by design) it will report everything as unused. That's expected, not a bug.

## Development

```sh
yarn install
yarn build       # tsup -> dist/
yarn typecheck
yarn test        # aggregate(), each runner (mocked), runCheck() orchestration, loadConfig() against real fixtures
yarn dev         # watch mode
```

Built with TypeScript pinned to the `6.x` line rather than `7.x`: TypeScript 7's Go-native compiler doesn't ship a stable programmatic/declaration-emit API until 7.1, which `tsup`'s `.d.ts` generation depends on. Worth revisiting once the ecosystem catches up.

## Contributing

Issues and PRs welcome at [github.com/Dreamyplayer/pubcheck-cli](https://github.com/Dreamyplayer/pubcheck-cli).

## License

MIT © [Dreamy Player](https://github.com/Dreamyplayer)
