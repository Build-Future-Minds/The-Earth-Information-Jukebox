// Runs the three test suites and writes how many passed to docs/measurements/test_counts.json, the
// numbers "How it's made" shows under "How we check it". Counts come from a real run, never typed.
//
//   npm run count-tests                       from web/: unit tests, browser tests and analysis/pytest
//   npm run count-tests -- --skip-e2e         leave the browser tests out (they are then "not run")
//   PYTHON=path/to/python npm run count-tests the Python that has OpenCV (default: python)
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = resolve(WEB, '..');
const OUT = join(ROOT, 'docs', 'measurements', 'test_counts.json');
const tmp = mkdtempSync(join(tmpdir(), 'es-counts-'));
const skipE2e = process.argv.includes('--skip-e2e');
// --e2e-config <file>: another Playwright config (for example one on a free port, when 5174 is taken).
const configAt = process.argv.indexOf('--e2e-config');
const e2eConfig = configAt > 0 ? ['-c', process.argv[configAt + 1]] : [];

function run(command, args, cwd, env = {}) {
  const result = spawnSync(command, args, { cwd, env: { ...process.env, ...env }, encoding: 'utf8', shell: true, maxBuffer: 1 << 28 });
  if (result.error) throw result.error;
  return result;
}

function git(...args) {
  return run('git', args, ROOT).stdout.trim();
}

// Vitest: the unit tests in web/src.
const vitestFile = join(tmp, 'vitest.json');
run('npx', ['vitest', 'run', '--reporter=json', `--outputFile=${vitestFile}`], WEB);
const vitest = JSON.parse(readFileSync(vitestFile, 'utf8'));
const unit = {
  command: 'npm test (in web/)',
  total: vitest.numTotalTests,
  passed: vitest.numPassedTests,
  failed: vitest.numFailedTests,
  skipped: vitest.numPendingTests + vitest.numTodoTests,
};

// Playwright: the browser tests in web/e2e, against the real app in Chromium.
let browser = null;
if (!skipE2e) {
  const playwrightFile = join(tmp, 'playwright.json');
  run('npx', ['playwright', 'test', ...e2eConfig, '--reporter=json'], WEB, { PLAYWRIGHT_JSON_OUTPUT_NAME: playwrightFile });
  const stats = JSON.parse(readFileSync(playwrightFile, 'utf8')).stats;
  browser = {
    command: 'npm run test:e2e (in web/)',
    total: stats.expected + stats.unexpected + stats.flaky + stats.skipped,
    passed: stats.expected,
    failed: stats.unexpected,
    flaky: stats.flaky,
    skipped: stats.skipped,
  };
}

// pytest: the math engine in analysis/.
const junitFile = join(tmp, 'pytest.xml');
run(process.env.PYTHON ?? 'python', ['-m', 'pytest', '-q', `--junitxml=${junitFile}`], join(ROOT, 'analysis'));
const suite = readFileSync(junitFile, 'utf8').match(/<testsuite [^>]*>/)[0];
const attr = (name) => Number(suite.match(new RegExp(` ${name}="(\\d+)"`))[1]);
const engine = {
  command: 'python -m pytest (in analysis/)',
  total: attr('tests'),
  passed: attr('tests') - attr('failures') - attr('errors') - attr('skipped'),
  failed: attr('failures') + attr('errors'),
  skipped: attr('skipped'),
};

const counts = {
  schema_version: '0.1',
  note: 'Written by web/scripts/count-tests.mjs from a real run. Do not edit by hand: run it again.',
  date: new Date().toLocaleDateString('sv'), // local YYYY-MM-DD, like the Python measurements
  commit: git('rev-parse', '--short', 'HEAD'),
  uncommitted_changes: git('status', '--porcelain').length > 0,
  suites: { engine, unit, browser },
};
writeFileSync(OUT, `${JSON.stringify(counts, null, 1)}\n`);
for (const [name, s] of Object.entries(counts.suites)) {
  console.log(`${name.padEnd(8)} ${s ? `${s.passed} of ${s.total} passed, ${s.failed} failed` : 'not run'}`);
}
console.log(`written: ${OUT}`);
