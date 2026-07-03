#!/usr/bin/env node
/**
 * CI retry helper for Vitest and Playwright tests.
 * Re-runs a single test or test file up to N times with verbose output to
 * confirm flakiness. Exits non-zero if any run fails.
 *
 * Usage:
 *   node scripts/retry-test.js <type> <target> [N=5]
 *
 * Types:
 *   unit       - Vitest test file/path
 *   unit-grep  - Vitest test by name (-t)
 *   e2e        - Playwright spec file/path
 *   e2e-grep   - Playwright test by title (-g)
 */

import { execSync } from 'child_process';

const type = process.argv[2];
const target = process.argv[3];
const count = parseInt(process.argv[4] || '5', 10);

if (!type || !target) {
  console.error('Usage: node scripts/retry-test.js <unit|unit-grep|e2e|e2e-grep> <target> [N=5]');
  process.exit(1);
}

const commands = {
  unit: `npx vitest run --reporter=verbose "${target}"`,
  'unit-grep': `npx vitest run --reporter=verbose -t "${target}"`,
  e2e: `npx playwright test "${target}" --reporter=line`,
  'e2e-grep': `npx playwright test -g "${target}" --reporter=line`,
};

const command = commands[type];
if (!command) {
  console.error(`Unknown type: ${type}. Choose one of: ${Object.keys(commands).join(', ')}`);
  process.exit(1);
}

let failures = 0;

for (let i = 1; i <= count; i += 1) {
  console.log(`\n==================== Retry run ${i}/${count} ====================`);
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    failures += 1;
    console.error(`\nRun ${i} failed.`);
  }
}

console.log(`\n==================== Summary ====================`);
console.log(`${count - failures}/${count} runs passed (${failures} failed).`);

if (failures > 0) {
  process.exit(1);
}
