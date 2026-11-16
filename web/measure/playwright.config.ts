// `npm run measure`: measurements of the picture scan on the real NASA pictures (see README.md).
// Separate from the browser tests in ../e2e, which always use the practice data.
import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';

/** 5175, or MEASURE_PORT when several copies of the repo measure at once on one machine. */
const PORT = Number(process.env.MEASURE_PORT ?? 5175);

export default defineConfig({
  testDir: '.',
  testMatch: '*.measure.ts',
  outputDir: '../test-results/measure',
  timeout: 300_000,
  workers: 1,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://localhost:${PORT}`,
    // Lets the level test start its own player without a click. The other measurements press the
    // app's buttons, as a person would.
    launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
  },
  webServer: {
    // No VITE_DATASET here: the app shows the real pictures in data/.
    command: `npx vite --port ${PORT} --strictPort`,
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
  },
});
