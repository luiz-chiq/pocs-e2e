import { Capacitor, registerPlugin } from '@capacitor/core'
import { maxPolygonFileBytes, validatePolygonDocument } from './polygon-document'

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

// No navegador, os mesmos documentos JSON usam o seletor de arquivo e downloads.
if (!window.polygonFiles) {
  window.polygonFiles = {
    importPolygons: () => new Promise(resolve => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json,application/json'
      input.hidden = true
      const finish = (result: PolygonFileResult) => { input.remove(); resolve(result) }
      input.addEventListener('cancel', () => finish({ status: 'cancelled' }), { once: true })
      input.addEventListener('change', () => {
        void (async () => {
          const file = input.files?.[0]
          if (!file) { finish({ status: 'cancelled' }); return }
          try {
            if (file.size > maxPolygonFileBytes) throw new Error('Escolha um arquivo JSON de até 10 MB.')
            let value: unknown
            try { value = JSON.parse((await file.text()).replace(/^\uFEFF/, '')) }
            catch { throw new Error('O arquivo não contém um JSON válido.') }
            finish({ status: 'success', fileName: file.name, polygons: validatePolygonDocument(value) })
          } catch (error) { finish({ status: 'error', message: error instanceof Error ? error.message : 'Não foi possível ler o arquivo.' }) }
        })()
      }, { once: true })
      document.body.append(input)
      input.click()
    }),
    exportPolygons: async polygons => {
      try {
        const version = polygons.some(item => !item.geometry.rings) ? 2 : 1
        const normalized = validatePolygonDocument({ format: 'poligonos', version, polygons })
        const content = JSON.stringify({ format: 'poligonos', version, polygons: normalized }, null, 2) + '\n'
        const blob = new Blob([content], { type: 'application/json' })
        if (blob.size > maxPolygonFileBytes) throw new Error('A exportação excede o limite de 10 MB.')
        const fileName = 'mapa.json'
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        document.body.append(link)
        link.click()
        link.remove()
        window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
        return { status: 'success', fileName, count: normalized.length }
      } catch (error) { return { status: 'error', message: error instanceof Error ? error.message : 'Não foi possível exportar o arquivo.' } }
    }
  }
}
