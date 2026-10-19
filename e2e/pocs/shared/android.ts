import { resolve } from 'node:path'

export const androidPackage = 'com.example.tasks.poc'
export const appiumUrl = `http://${process.env.APPIUM_HOST ?? '127.0.0.1'}:${process.env.APPIUM_PORT ?? '4723'}/`
export const androidCapabilities = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:deviceName': process.env.ANDROID_DEVICE_NAME ?? 'Android Emulator',
  ...(process.env.ANDROID_SERIAL ? { 'appium:udid': process.env.ANDROID_SERIAL } : {}),
  'appium:app': resolve(process.env.ANDROID_APK ?? 'android/app/build/outputs/apk/debug/app-debug.apk'),
  'appium:appPackage': androidPackage,
  'appium:appActivity': '.MainActivity',
  'appium:autoWebview': true,
  'appium:autoWebviewTimeout': 45_000,
  'appium:ensureWebviewsHavePages': true,
  'appium:enableWebviewDetailsCollection': true,
  'appium:recreateChromeDriverSessions': true,
  'appium:autoGrantPermissions': true,
  'appium:newCommandTimeout': 120,
  'appium:noReset': false
}
