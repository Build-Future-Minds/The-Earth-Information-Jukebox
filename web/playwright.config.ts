// Browser tests for the Dev B checklist (docs/roles/developer-b.md). Run: npm run test:e2e
// They drive the real app with real key presses and read the dev-only note log
// (window.__earthNotes) to check the actual sound schedule, not just the screen.
//
// Two projects, each with its own server:
//   practice   the practice data (one picture). Every test file except scan-pictures.
//   pictures   the practice data plus made-up pictures read with the real rain and aerosol scan
//              rules (VITE_DATASET=practice-pictures). Only scan-pictures.e2e.ts.
// E2E_PORT and E2E_PICTURES_PORT move the servers, so two copies of the repo can test at once.
import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 5174);
const picturesPort = Number(process.env.E2E_PICTURES_PORT ?? 5176);

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
    { name: 'practice', testIgnore: 'scan-pictures.e2e.ts', use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${port}` } },
    { name: 'pictures', testMatch: 'scan-pictures.e2e.ts', use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${picturesPort}` } },
  ],
  webServer: [
    {
      command: `npx vite --port ${port} --strictPort`,
      url: `http://localhost:${port}`,
      reuseExistingServer: false, // a running dev server may be showing real data
      // Always the practice data, even when real files are in data/: the expected rhythms are theirs.
      env: { VITE_DATASET: 'practice' },
    },
    {
      command: `npx vite --port ${picturesPort} --strictPort`,
      url: `http://localhost:${picturesPort}`,
      reuseExistingServer: false,
      // Practice data plus TEST INPUT pictures for each picture's scan rule (data/testPictures.ts).
      env: { VITE_DATASET: 'practice-pictures' },
    },
  ],
});
