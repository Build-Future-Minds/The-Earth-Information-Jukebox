// Browser tests for the Dev B checklist (docs/roles/developer-b.md). Run: npm run test:e2e
// They drive the real app with real key presses and read the dev-only note log
// (window.__earthNotes) to check the actual sound schedule, not just the screen.
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  testMatch: '*.e2e.ts', // not *.test.ts, so Vitest does not pick these up
  timeout: 60_000,
  workers: 1, // audio timing: keep tests from competing for the CPU
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:5174',
  },
  webServer: {
    command: 'npx vite --port 5174 --strictPort',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
  },
});
