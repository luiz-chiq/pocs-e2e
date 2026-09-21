describe('Polígonos ArcGIS', () => {
  beforeEach(async () => {
    await browser.url('/')
    await $('[data-testid="map-ready"]').waitForDisplayed()
    await $('[data-testid="clear-polygons"]').click()
  })

  it('cria três polígonos e inicia a edição por arraste', async () => {
    const map = $('[data-testid="arcgis-map"]')
    const { width, height } = await map.getSize()
    const click = async (x: number, y: number) => browser.action('pointer').move({ origin: map, x, y }).down().up().perform()
    const drag = async (x: number, y: number, deltaX: number, deltaY: number) => browser.action('pointer')
      .move({ origin: map, x, y })
      .down({ button: 0 })
      .pause(250)
      .move({ origin: 'pointer', x: deltaX, y: deltaY, duration: 800 })
      .pause(250)
      .up({ button: 0 })
      .perform()
    const triangles = [
      [[-0.3, -0.2], [-0.2, -0.05], [-0.4, -0.05]],
      [[0.05, -0.2], [0.18, -0.05], [-0.08, -0.05]],
      [[-0.12, 0.2], [0.05, 0.33], [-0.25, 0.33]]
    ]

    for (const triangle of triangles) {
      await $('[data-testid="draw-polygon"]').click()
      for (const [x, y] of triangle) await click(Math.round(width * x), Math.round(height * y))
      await $('[data-testid="finish-drawing"]').click()
    }

    await browser.waitUntil(async () => (await browser.execute(() => document.querySelectorAll('[data-testid="polygon-item"]').length)) === 3)

    // 1. Ativa movimento e move o polígono inteiro pelo centro.
    const centerX = Math.round(width * -0.3)
    const centerY = Math.round(height * -0.1)
    await $('[data-testid="move-polygon"]').click()
    await browser.pause(500)
    await drag(centerX, centerY, 70, 45)
    const lastEdit = $('[data-testid="last-edit"]')
    await browser.waitUntil(async () => (await lastEdit.getText()) === 'Polígono movido.')

    // 2. Arrasta o primeiro vértice, já deslocado junto com o polígono.
    const vertexX = Math.round(width * -0.3) + 70
    const vertexY = Math.round(height * -0.2) + 45
    await $('[data-testid="edit-polygon"]').click()
    await browser.pause(500)
    await drag(vertexX, vertexY, 45, 35)
    await browser.waitUntil(async () => (await lastEdit.getText()) === 'Vértice ou aresta arrastada.')

    // 3. Clica na alça fantasma no meio da primeira aresta para criar um vértice.
    const edgeX = Math.round((vertexX + 45 + Math.round(width * -0.2) + 70) / 2)
    const edgeY = Math.round((vertexY + 35 + Math.round(height * -0.05) + 45) / 2)
    await click(edgeX, edgeY)
    await expect($('[data-testid="last-edit"]')).toHaveText(expect.stringContaining('adicionado'))
    await click(Math.round(width * 0.42), Math.round(height * 0.4))
    await expect($('#map-instructions')).toHaveText(expect.stringContaining('editado'))

    if (process.env.HEADLESS === 'false') await browser.pause(5_000)
  })
})
