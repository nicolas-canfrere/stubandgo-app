import { defineConfig, devices } from '@playwright/test';
import { FRONT_URL } from './e2e/stack.ts';

// Run through `make e2e`, in the Playwright image pinned in compose.yaml, against stacks that are
// already running (the front from `make up`, the API from its own repository).
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 120_000,
  reporter: 'list',
  use: {
    baseURL: FRONT_URL,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
