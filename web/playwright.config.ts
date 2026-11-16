// Browser tests for the Dev B checklist (docs/roles/developer-b.md). Run: npm run test:e2e
// They drive the real app with real key presses and read the dev-only note logs
// (window.__earthNotes, window.__scanNotes) to check the actual sound schedule, not just the screen.
//
// Two projects, each with its own dev server:
//   practice  *.e2e.ts        the practice data, always: the expected rhythms are theirs
//   real      *.real.e2e.ts   the NASA pictures in data/: Listen's scan on each picture (P1)
//
// Ports: 5174 and 5186, or E2E_PORT and E2E_REAL_PORT when several copies of the repo run their
// tests at once on one machine (each needs its own ports).
import { defineConfig, devices } from '@playwright/test';

const PRACTICE_PORT = Number(process.env.E2E_PORT ?? 5174);
const REAL_PORT = Number(process.env.E2E_REAL_PORT ?? 5186);

export default defineConfig({
  testDir: 'e2e',
  testMatch: '*.e2e.ts', // not *.test.ts, so Vitest does not pick these up
  timeout: 60_000,
  workers: 1, // audio timing: keep tests from competing for the CPU
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    ...devices['Desktop Chrome'],
  },
  projects: [
    { name: 'practice', testIgnore: '*.real.e2e.ts', use: { baseURL: `http://localhost:${PRACTICE_PORT}` } },
    { name: 'real', testMatch: '*.real.e2e.ts', use: { baseURL: `http://localhost:${REAL_PORT}` } },
  ],
  webServer: [
    {
      command: `npx vite --port ${PRACTICE_PORT} --strictPort`,
      url: `http://localhost:${PRACTICE_PORT}`,
      reuseExistingServer: false, // a running dev server may be showing real data
      // Always the practice data, even when real files are in data/: the expected rhythms are theirs.
      env: { VITE_DATASET: 'practice' },
    },
    {
      // No VITE_DATASET: the app shows the real pictures in data/.
      command: `npx vite --port ${REAL_PORT} --strictPort`,
      url: `http://localhost:${REAL_PORT}`,
      reuseExistingServer: false,
    },
  ],
});
