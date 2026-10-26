import { By, WebDriver, until, type WebElement } from 'selenium-webdriver'
import type { Request } from 'selenium-webdriver/http.js'
import { createRequire } from 'node:module'
import { Command, Name } from 'selenium-webdriver/lib/command.js'
import { writeFile } from 'node:fs/promises'

const { Executor, Response } = createRequire(import.meta.url)('selenium-webdriver/http') as typeof import('selenium-webdriver/http.js')

/** Cliente Selenium para comandos nativos Appium; não cria sessão de navegador. */
export async function createNativeAppiumSession(address: string, capabilities: object, { timeoutMs = 30_000 } = {}) {
  const executor = new Executor({
    async send(raw: Request) {
      const request = raw as unknown as { method: string; path: string; data?: unknown }
      const response = await fetch(`${address.replace(/\/$/, '')}${request.path}`, {
        method: request.method,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        ...(request.method === 'GET' || request.method === 'DELETE' ? {} : { body: JSON.stringify(request.data ?? {}) }),
        signal: AbortSignal.timeout(timeoutMs)
      })
      return new Response(response.status, Object.fromEntries(response.headers), await response.text())
    }
  })
  executor.defineCommand('appiumCurrentContext', 'GET', '/session/:sessionId/context')
  executor.defineCommand('appiumCurrentPackage', 'GET', '/session/:sessionId/appium/device/current_package')
  executor.defineCommand('appiumSettings', 'POST', '/session/:sessionId/appium/settings')
  // Selenium usa um script DOM por padrão; Appium nativo expõe seu próprio endpoint.
  executor.defineCommand(Name.IS_ELEMENT_DISPLAYED, 'GET', '/session/:sessionId/element/:id/displayed')
  const driver = await WebDriver.createSession(executor, { browserName: '', ...capabilities })
  const command = <T>(name: string, parameters: object = {}) => driver.execute(new Command(name).setParameters(parameters)) as Promise<T>
  return {
    sessionId: (await driver.getSession()).getId(),
    getContext: () => command<string>('appiumCurrentContext'),
    getCurrentPackage: () => command<string>('appiumCurrentPackage'),
    updateSettings: (settings: object) => command<void>('appiumSettings', { settings }),
    getPageSource: () => driver.getPageSource(),
    back: () => driver.navigate().back(),
    quit: () => driver.quit(),
    saveScreenshot: async (path: string) => { await writeFile(path, Buffer.from(await driver.takeScreenshot(), 'base64')) },
    element: (selector: string) => {
      const locator = selector.startsWith('android=')
        ? new By('-android uiautomator', selector.slice('android='.length))
        : By.xpath(selector)
      let element: WebElement | undefined
      return {
        waitForDisplayed: async ({ timeout }: { timeout: number }) => {
          element = await driver.wait(until.elementLocated(locator), timeout)
          await driver.wait(until.elementIsVisible(element), timeout)
        },
        click: async () => { await (element ?? driver.findElement(locator)).click() }
      }
    }
  }
}
