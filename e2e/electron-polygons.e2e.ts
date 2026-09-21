describe('Polígonos ArcGIS no Electron', () => {
  it('abre a aplicação desktop e disponibiliza o editor de polígonos', async () => {
    await $('[data-testid="map-ready"]').waitForDisplayed()
    await expect($('[data-testid="draw-polygon"]')).toBeDisplayed()
    await expect($('[data-testid="arcgis-map"]')).toBeDisplayed()
  })

  after(async () => {
    const electronBrowser = browser as typeof browser & {
      electron?: { execute: (callback: (electron: { app: { quit: () => void } }) => void) => Promise<void> }
    }
    if (electronBrowser.electron) await electronBrowser.electron.execute((electron) => electron.app.quit())
  })
})
