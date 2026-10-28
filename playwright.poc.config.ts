import { defineConfig } from '@playwright/test'
import { appUrl, target, viewport } from './e2e/pocs/shared/fixtures'
import { pocWorkers } from './e2e/pocs/shared/parallel'

export default defineConfig({
  testDir: './e2e/pocs/playwright',
  workers: pocWorkers(target),
  fullyParallel: target === 'web',
  retries: 0,
  timeout: target === 'android' ? 180_000 : 90_000,
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
