/**
 * Executa a MESMA suíte de negócio de e2e/cancel-edit.e2e.ts no WebView
 * empacotado pelo Capacitor. Requer Appium + UiAutomator2 e um emulador ou
 * dispositivo Android já disponível no adb.
 */
export const config = {
  runner: 'local',
  specs: ['./e2e/cancel-edit.e2e.ts'],
  maxInstances: 1,
  hostname: process.env.APPIUM_HOST ?? '127.0.0.1',
  port: Number(process.env.APPIUM_PORT ?? 4723),
  path: '/',
  logLevel: 'warn',
  waitforTimeout: 15_000,
  connectionRetryTimeout: 120_000,
  connectionRetryCount: 1,
  capabilities: [{
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': process.env.ANDROID_DEVICE_NAME ?? 'Android Emulator',
    'appium:appPackage': 'com.example.tasks.poc',
    'appium:appActivity': '.MainActivity',
    'appium:autoWebview': true,
    'appium:newCommandTimeout': 120
  }],
  framework: 'mocha',
  reporters: ['spec'],
  before: () => { process.env.E2E_TARGET = 'android' },
  mochaOpts: { ui: 'bdd', timeout: 90_000 }
}
