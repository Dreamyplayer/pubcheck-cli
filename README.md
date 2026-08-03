# pubcheck

One combined pass/fail verdict from [`publint`](https://publint.dev), [`arethetypeswrong`](https://arethetypeswrong.github.io) (attw), and [`Knip`](https://knip.dev) — instead of running all three separately and reading three different outputs.

```
pubcheck  ✔ publint   ✔ attw   ✖ knip (3 issues)

✖ FAIL — 0 errors, 3 warnings

knip
  ✖ unused-exports: formatDate (src/utils.ts)
  ✖ unused-exports: Config (src/types.ts)
  ✖ unused-dependencies: lodash
```

## Why

Every one of these tools catches something the other two miss before you `npm publish`:

- **publint** — package.json correctness: wrong `exports` map, broken `main`/`module`/`types` fields, ESM/CJS mismatches.
- **attw** — whether your published _types_ actually resolve the way your published _code_ does, across `node10`/`node16`/`bundler` resolution.
- **Knip** — unused files, exports, and dependencies you're shipping (or forgot to ship).

Running all three separately means three commands and three different output formats to reconcile by hand. `pubcheck` runs them together and gives you one verdict and one exit code.

## Install

```sh
yarn add -D pubcheck-cli
```

## Usage

```sh
# check the current directory
npx pubcheck

# check a specific package
npx pubcheck ./packages/my-lib

# machine-readable output for CI
npx pubcheck --json

# show every issue, including low-severity suggestions
npx pubcheck --verbose

# skip a tool (e.g. no TypeScript types to check)
npx pubcheck --skip attw
```

Exit code is `0` when everything passes, `1` otherwise — safe to drop straight into CI or a `prepublishOnly` script.

## Configuration

`pubcheck` looks for config in (in order): `pubcheck` field in `package.json`, `pubcheck.config.ts`, `pubcheck.config.js`, `.pubcheckrc`.

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

- **publint** — called programmatically (`publint({ pkgDir })`); it's a pure function with a stable API.
- **attw** — called programmatically against a real `npm pack` tarball (via `@arethetypeswrong/core`), so it sees exactly what would ship, after `files`/`.npmignore` filtering. `@arethetypeswrong/core` is still pre-1.0 and its README warns the API can change between minors — the dependency is pinned to an exact version rather than a caret range.
- **Knip** — shelled out to (`npx knip --reporter json --no-exit-code`), not embedded. Knip's `main()` export exists but mutates `process.cwd`/`console` and its internal shape isn't guaranteed stable across minors; the JSON reporter is the one contract Knip documents as stable.

## Development

```sh
yarn install
yarn build        # tsup -> dist/
yarn typecheck
yarn test          # 28 tests: aggregate(), each runner (mocked), runCheck() orchestration, loadConfig() against real fixtures
yarn dev          # watch mode
```

Built with TypeScript pinned to the `6.x` line rather than `7.x`: TypeScript 7's Go-native compiler doesn't ship a stable programmatic/declaration-emit API until 7.1, which `tsup`'s `.d.ts` generation depends on. Worth revisiting once the ecosystem (tsup, ts-node-style tooling) catches up.

## License

MIT
