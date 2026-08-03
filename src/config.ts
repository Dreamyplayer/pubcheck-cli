import { cosmiconfig } from 'cosmiconfig';
import { TypeScriptLoader } from 'cosmiconfig-typescript-loader';
import type { ToolName } from './runners/types.js';

export interface PubcheckConfig {
  /** Tools to skip entirely, e.g. skip attw in a pure-JS package with no types. */
  skip?: ToolName[];
  /** Per-tool option overrides, passed through to each underlying tool. */
  tools?: Partial<Record<ToolName, Record<string, unknown>>>;
}

const explorer = cosmiconfig('pubcheck', {
  searchPlaces: [
    'package.json',
    'pubcheck.config.ts',
    'pubcheck.config.js',
    'pubcheck.config.mjs',
    'pubcheck.config.json',
    '.pubcheckrc',
    '.pubcheckrc.json',
  ],
  loaders: {
    '.ts': TypeScriptLoader(),
  },
});

export async function loadConfig(cwd: string): Promise<PubcheckConfig> {
  const result = await explorer.search(cwd);
  return (result?.config as PubcheckConfig | undefined) ?? {};
}
