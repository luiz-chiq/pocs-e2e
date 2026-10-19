import { mkdirSync, writeFileSync } from 'node:fs'
import type { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter'
import { appUrl, target } from '../shared/fixtures'

export default class PocReporter implements Reporter {
  private results: object[] = []

  onTestEnd(test: TestCase, result: TestResult) {
    this.results.push({
      title: test.title,
      status: result.status,
      durationMs: result.duration,
      error: result.error?.message,
      attachments: result.attachments.map(({ name, path, body, contentType }) => ({
        name, path, contentType,
        inline: contentType === 'application/json' && body ? JSON.parse(body.toString('utf8')) : undefined
      }))
    })
  }

  onEnd(result: FullResult) {
    const directory = `${process.env.POC_RESULTS_DIR ?? `test-results/pocs/${target}`}/playwright`
    mkdirSync(directory, { recursive: true })
    writeFileSync(`${directory}/results.json`, JSON.stringify({
      framework: 'playwright', target, url: appUrl,
      status: result.status, durationMs: result.duration, tests: this.results
    }, null, 2))
  }
}
