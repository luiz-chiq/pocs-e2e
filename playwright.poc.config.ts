import { defineConfig } from '@playwright/test'
import { appUrl, target, viewport } from './e2e/pocs/shared/fixtures'

export default defineConfig({
  testDir: './e2e/pocs/playwright',
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  outputDir: `${process.env.POC_RESULTS_DIR ?? `test-results/pocs/${target}`}/playwright/artifacts`,
  reporter: [['list'], ['./e2e/pocs/playwright/reporter.ts']],
  use: {
    baseURL: appUrl,
    channel: 'chrome',
    viewport,
    hasTouch: true,
    headless: process.env.HEADLESS !== 'false',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 45_000
  }
})
