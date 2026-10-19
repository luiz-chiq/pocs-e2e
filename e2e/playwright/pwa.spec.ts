import { expect, test, type Page } from '@playwright/test'

test.use({ hasTouch: true })

async function offerInstallation(page: Page, outcome: 'accepted' | 'dismissed' | 'error') {
  await page.evaluate((result) => {
    const event = new Event('beforeinstallprompt', { cancelable: true })
    Object.assign(event, {
      prompt: async () => {
        document.documentElement.dataset.installPromptOpened = 'true'
        if (result === 'error') throw new Error('Installation unavailable')
      },
      userChoice: Promise.resolve({ outcome: result })
    })
    window.dispatchEvent(event)
  }, outcome)
}

test('explica a instalação pelo menu quando não há prompt disponível', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('install-app').tap()
  await expect(page.getByRole('dialog', { name: 'Instalar Polígonos' })).toBeVisible()
  await expect(page.locator('#install-dialog-description')).toContainText('Chrome ou Edge')
  await page.getByRole('button', { name: 'Entendi' }).click()
  await expect(page.locator('#install-dialog')).not.toBeVisible()
})

test('abre o prompt e oculta o botão quando a instalação é aceita', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('install-app')).toBeVisible()
  await offerInstallation(page, 'accepted')
  await page.getByTestId('install-app').tap()
  await expect(page.locator('html')).toHaveAttribute('data-install-prompt-opened', 'true')
  await expect(page.getByTestId('install-app')).toBeHidden()
})

test('permite tentar novamente depois de cancelar a instalação', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('install-app')).toBeVisible()
  await offerInstallation(page, 'dismissed')
  await page.getByTestId('install-app').tap()
  await expect(page.getByTestId('install-app')).toBeEnabled()
  await page.getByTestId('install-app').tap()
  await expect(page.locator('#install-dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Entendi' }).click()
  await offerInstallation(page, 'accepted')
  await page.getByTestId('install-app').tap()
  await expect(page.getByTestId('install-app')).toBeHidden()
})

test('orienta o usuário se o prompt falhar', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('install-app')).toBeVisible()
  await offerInstallation(page, 'error')
  await page.getByTestId('install-app').tap()
  await expect(page.locator('#install-dialog-description')).toContainText('Não foi possível abrir a instalação')
  await expect(page.getByTestId('install-app')).toBeEnabled()
})

test('oculta a instalação quando o navegador confirma que o app foi instalado', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('install-app').tap()
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')))
  await expect(page.getByTestId('install-app')).toBeHidden()
  await expect(page.locator('#install-dialog')).not.toBeVisible()
})

test('oculta o botão em modo standalone', async ({ page }) => {
  await page.addInitScript(() => {
    const originalMatchMedia = window.matchMedia.bind(window)
    window.matchMedia = (query) => {
      const media = originalMatchMedia(query)
      if (query === '(display-mode: standalone)') Object.defineProperty(media, 'matches', { value: true })
      return media
    }
  })
  await page.goto('/')
  await expect(page.getByTestId('install-app')).toBeHidden()
})

test('exibe instruções de instalação no iPhone', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'userAgent', {
    value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'
  }))
  await page.goto('/')
  await page.getByTestId('install-app').tap()
  await expect(page.locator('#install-dialog-description')).toContainText('Adicionar à Tela de Início')
})

test('ignora cliques de mouse sem consumir o prompt, mesmo com touch disponível', async ({ page }) => {
  await page.goto('/')
  const install = page.getByTestId('install-app')
  await offerInstallation(page, 'accepted')
  await install.click()
  await expect(page.locator('html')).not.toHaveAttribute('data-install-prompt-opened', 'true')
  await expect(page.locator('#install-dialog')).toBeHidden()
  await expect(install).toBeVisible()
  await expect(install).toBeEnabled()
  await install.tap()
  await expect(page.locator('html')).toHaveAttribute('data-install-prompt-opened', 'true')
  await expect(install).toBeHidden()
})

test('somente touch abre as instruções; mouse e teclado não ativam o botão', async ({ page }) => {
  await page.goto('/')
  const install = page.getByTestId('install-app')
  await install.click()
  await install.press('Enter')
  await install.press('Space')
  await expect(page.locator('#install-dialog')).toBeHidden()
  await install.tap()
  await expect(page.locator('#install-dialog')).toBeVisible()
})
