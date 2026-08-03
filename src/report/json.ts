import type { Verdict } from './aggregate.js';

export function renderJson(verdict: Verdict): string {
  return JSON.stringify(verdict, null, 2);
}
