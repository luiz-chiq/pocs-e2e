import { Capacitor, registerPlugin } from '@capacitor/core'

// A mesma interface do preload Electron; a leitura e escrita ficam no código nativo.
if (Capacitor.getPlatform() === 'android') {
  const files = registerPlugin<{
    importPolygons(): Promise<PolygonFileResult>
    exportPolygons(options: { polygons: PolygonFileData[] }): Promise<PolygonFileResult>
  }>('PolygonFiles')
  window.polygonFiles = {
    importPolygons: () => files.importPolygons(),
    exportPolygons: polygons => files.exportPolygons({ polygons })
  }
}
