export const config = {
  runner: 'local',
  // Os cenários são os mesmos do navegador/PWA. Esta configuração troca apenas
  // o alvo: abre a janela Electron em vez de iniciar o Chrome.
  specs: ['./e2e/cancel-edit.e2e.ts'],
  maxInstances: 1,
  capabilities: [{
    browserName: 'electron',
    'wdio:electronServiceOptions': { appEntryPoint: './electron/main.cjs' }
  }],
  logLevel: 'warn',
  waitforTimeout: 10_000,
  framework: 'mocha',
  reporters: ['spec'],
  services: ['electron'],
  before: () => { process.env.E2E_TARGET = 'electron' },
  mochaOpts: { ui: 'bdd', timeout: 60_000 }
}
