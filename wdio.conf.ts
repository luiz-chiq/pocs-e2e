const chromeArguments = ['--window-size=1440,900']
if (process.env.HEADLESS !== 'false') chromeArguments.unshift('--headless=new')

export const config = {
  runner: 'local',
  specs: ['./e2e/cancel-edit.e2e.ts'],
  maxInstances: 1,
  capabilities: [{ browserName: 'chrome', 'goog:chromeOptions': { args: chromeArguments } }],
  logLevel: 'warn',
  baseUrl: process.env.BASE_URL ?? 'http://localhost:5173',
  waitforTimeout: 10_000,
  connectionRetryTimeout: 120_000,
  connectionRetryCount: 1,
  framework: 'mocha',
  reporters: ['spec'],
  before: () => { process.env.E2E_TARGET = 'browser' },
  mochaOpts: { ui: 'bdd', timeout: 60_000 }
}
