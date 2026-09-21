const polygonItems = () => $$('[data-testid="polygon-item"]')

type ScreenPoint = { x: number; y: number }
type SelectedScreenPoints = { center: ScreenPoint; vertices: ScreenPoint[]; edgeMidpoint: ScreenPoint }

async function visualPause() {
  if (process.env.HEADLESS === 'false') await browser.pause(1_500)
}

function runsInsideNativeShell() {
  const browserWithElectron = browser as typeof browser & { electron?: unknown }
  const platformName = String((browser.capabilities as { platformName?: string }).platformName ?? '').toLowerCase()
  return process.env.E2E_TARGET === 'electron' || process.env.E2E_TARGET === 'android' || Boolean(browserWithElectron.electron) || platformName === 'android'
}

async function selectedScreenPoints(): Promise<SelectedScreenPoints> {
  return browser.execute(() => {
    const testWindow = window as typeof window & {
      polygonTestApi?: { getSelectedScreenPoints: () => SelectedScreenPoints }
    }
    if (!testWindow.polygonTestApi) throw new Error('API de coordenadas E2E indisponível.')
    return testWindow.polygonTestApi.getSelectedScreenPoints()
  })
}

async function waitForPersistence() {
  const result = await browser.executeAsync((done: (result: { error?: string } | null) => void) => {
    const testWindow = window as typeof window & {
      polygonTestApi?: { waitForPersistence: () => Promise<void> }
    }
    if (!testWindow.polygonTestApi) {
      done({ error: 'API de persistência E2E indisponível.' })
      return
    }
    void testWindow.polygonTestApi.waitForPersistence()
      .then(() => done(null))
      .catch((error: unknown) => done({ error: String(error) }))
  })
  if (result?.error) throw new Error(result.error)
}

async function dragMapPoint(point: ScreenPoint, deltaX: number, deltaY: number) {
  const map = $('[data-testid="arcgis-map"]')
  const location = await map.getLocation()
  const steps = 5
  const horizontalStep = deltaX / steps
  const verticalStep = deltaY / steps
  await browser.performActions([{
    type: 'pointer',
    id: 'polygon-drag',
    parameters: { pointerType: 'mouse' },
    actions: [
      { type: 'pointerMove', duration: 0, origin: 'viewport', x: Math.round(location.x + point.x), y: Math.round(location.y + point.y) },
      { type: 'pointerDown', button: 0 },
      { type: 'pause', duration: 250 },
      ...Array.from({ length: steps }, () => ({ type: 'pointerMove' as const, duration: 150, origin: 'pointer' as const, x: horizontalStep, y: verticalStep })),
      { type: 'pointerUp', button: 0 }
    ]
  }])
}

async function clickMapPoint(point: ScreenPoint) {
  const map = $('[data-testid="arcgis-map"]')
  const location = await map.getLocation()
  await browser.action('pointer', { parameters: { pointerType: 'mouse' } })
    .move({ origin: 'viewport', x: Math.round(location.x + point.x), y: Math.round(location.y + point.y) })
    .down({ button: 0 })
    .up({ button: 0 })
    .perform()
}

async function createPolygon(points: Array<[number, number]>) {
  const map = $('[data-testid="arcgis-map"]')
  const clickAt = async (x: number, y: number) => browser.action('pointer', { parameters: { pointerType: 'mouse' } })
    .move({ origin: map, x, y })
    .down({ button: 0 })
    .up({ button: 0 })
    .perform()

  await $('[data-testid="draw-polygon"]').click()
  for (const [x, y] of points) await clickAt(x, y)
  await $('[data-testid="finish-drawing"]').click()
  await browser.waitUntil(async () => await (await polygonItems()).length > 0)
}

async function clearPolygonsWithConfirmation() {
  const clear = $('[data-testid="clear-polygons"]')
  if (await clear.isEnabled()) {
    await clear.click()
    await $('#clear-dialog').waitForDisplayed()
    await $('#confirm-clear').click()
    await browser.waitUntil(async () => !(await clear.isEnabled()))
  }
}

describe('Editor de polígonos', () => {
  beforeEach(async () => {
    if (!runsInsideNativeShell()) await browser.setWindowSize(640, 900)
    // Chrome recebe uma URL. Electron e Capacitor já abrem a aplicação
    // empacotada e não devem navegar para um servidor externo.
    if (!runsInsideNativeShell()) await browser.url('/')
    await $('[data-testid="map-ready"]').waitForDisplayed()
    await clearPolygonsWithConfirmation()
  })

  it('cria, expande os vértices e mantém a edição até uma confirmação explícita', async () => {
    await createPolygon([[-120, -50], [0, -50], [-60, 50]])

    await expect($('#polygon-count')).toHaveText('1')
    await expect($('[data-testid="clear-polygons"]')).toBeEnabled()
    await $('[data-testid="expand-polygon"]').click()
    await browser.waitUntil(async () => await (await $$('.vertex-list li')).length === 3)

    await $('.polygon-label').click()
    await expect($('[data-testid="draw-polygon"]')).not.toBeDisplayed()
    await expect($('[data-testid="finish-drawing"]')).toBeDisplayed()
    await expect($('[data-testid="cancel-editing"]')).toBeDisplayed()

    const map = $('[data-testid="arcgis-map"]')
    await browser.action('pointer', { parameters: { pointerType: 'mouse' } })
      .move({ origin: map, x: 150, y: 120 })
      .down({ button: 0 })
      .up({ button: 0 })
      .perform()
    await expect($('[data-testid="cancel-editing"]')).toBeDisplayed()

    await $('[data-testid="finish-drawing"]').click()
    await browser.waitUntil(async () => !(await $('[data-testid="finish-drawing"]').isDisplayed()))
    await expect($('[data-testid="draw-polygon"]')).toBeDisplayed()
  })

  it('restaura as coordenadas originais ao cancelar uma edição', async () => {
    await createPolygon([[-120, -50], [0, -50], [-60, 50]])
    await $('[data-testid="expand-polygon"]').click()
    const originalCoordinates = await $('.vertex-list').getText()

    await $('.polygon-label').click()
    await $('[data-testid="cancel-editing"]').waitForDisplayed()
    const points = await selectedScreenPoints()
    await dragMapPoint(points.vertices[0], 90, 50)
    await expect($('[data-testid="last-edit"]')).toHaveText('Vértice ou aresta arrastada.')
    await browser.waitUntil(async () => (await $('.vertex-list').getText()) !== originalCoordinates)

    await $('[data-testid="cancel-editing"]').click()
    await browser.waitUntil(async () => (await $('.vertex-list').getText()) === originalCoordinates)
  })

  it('move o polígono, arrasta um vértice e cria outro no meio da aresta', async () => {
    await createPolygon([[-120, -50], [0, -50], [-60, 50]])
    await $('[data-testid="expand-polygon"]').click()
    await $('.polygon-label').click()
    await $('[data-testid="cancel-editing"]').waitForDisplayed()

    await dragMapPoint((await selectedScreenPoints()).center, 70, 40)
    await expect($('[data-testid="last-edit"]')).toHaveText('Polígono movido.')
    await visualPause()

    await dragMapPoint((await selectedScreenPoints()).vertices[0], 45, 35)
    await expect($('[data-testid="last-edit"]')).toHaveText('Vértice ou aresta arrastada.')
    await visualPause()

    await clickMapPoint((await selectedScreenPoints()).edgeMidpoint)
    await browser.waitUntil(async () => await (await $$('.vertex-list li')).length === 4)
    await visualPause()

    if (process.env.HEADLESS === 'false') await browser.pause(5_000)
  })

  it('persiste os polígonos após recarregar a aplicação', async () => {
    await createPolygon([[-120, -50], [0, -50], [-60, 50]])
    await waitForPersistence()
    await browser.refresh()
    await $('[data-testid="map-ready"]').waitForDisplayed()
    await expect(polygonItems()).toBeElementsArrayOfSize(1)
    await expect($('#polygon-count')).toHaveText('1')
  })

  it('pede confirmação antes de excluir um polígono individual', async () => {
    await createPolygon([[-120, -50], [0, -50], [-60, 50]])
    const remove = $('[data-testid="delete-polygon"]')
    await remove.click()
    await expect($('#clear-dialog')).toBeDisplayed()
    await expect($('#clear-dialog-title')).toHaveText('Apagar este polígono?')
    await $('#dismiss-clear').click()
    await expect(polygonItems()).toBeElementsArrayOfSize(1)

    await $('[data-testid="delete-polygon"]').click()
    await $('#confirm-clear').click()
    await browser.waitUntil(async () => await (await polygonItems()).length === 0)
    await expect($('[data-testid="clear-polygons"]')).toBeDisabled()
  })

  it('pede confirmação antes de apagar todos os polígonos', async () => {
    await createPolygon([[-120, -50], [0, -50], [-60, 50]])
    await createPolygon([[40, -50], [140, -50], [90, 50]])
    await expect(polygonItems()).toBeElementsArrayOfSize(2)

    await $('[data-testid="clear-polygons"]').click()
    await expect($('#clear-dialog-title')).toHaveText('Apagar todos os polígonos?')
    await $('#dismiss-clear').click()
    await expect(polygonItems()).toBeElementsArrayOfSize(2)

    await $('[data-testid="clear-polygons"]').click()
    await $('#confirm-clear').click()
    await browser.waitUntil(async () => await (await polygonItems()).length === 0)
    await expect($('[data-testid="clear-polygons"]')).toBeDisabled()
  })

  it('recolhe o painel e exibe o controle de abrir no menu do mapa', async () => {
    await expect($('#sidebar-close')).toBeDisplayed()
    await expect($('[data-testid="sidebar-toggle"]')).not.toBeDisplayed()

    await $('#sidebar-close').click()
    await browser.waitUntil(async () => await browser.execute(() => document.querySelector('.workspace')?.classList.contains('sidebar-collapsed')))
    await expect($('[data-testid="sidebar-toggle"]')).toBeDisplayed()

    await $('[data-testid="sidebar-toggle"]').click()
    await browser.waitUntil(async () => !(await browser.execute(() => document.querySelector('.workspace')?.classList.contains('sidebar-collapsed'))))
    await expect($('#sidebar-close')).toBeDisplayed()
  })

  after(async () => {
    const electronBrowser = browser as typeof browser & {
      electron?: { execute: (callback: (electron: { app: { quit: () => void } }) => void) => Promise<void> }
    }
    if (electronBrowser.electron) await electronBrowser.electron.execute((electron) => electron.app.quit())
  })
})
