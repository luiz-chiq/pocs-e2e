import { Capacitor, registerPlugin } from '@capacitor/core'
import { maxPolygonFileBytes, validatePolygonDocument, createExportDocument, type ExportDocument } from './polygon-document'

// A mesma interface do preload Electron; a leitura e escrita ficam no código nativo.
if (Capacitor.getPlatform() === 'android') {
  const files = registerPlugin<{
    importPolygons(): Promise<PolygonFileResult>
    exportDocument(options: { document: ExportDocument }): Promise<PolygonFileResult>
  }>('PolygonFiles')
  window.polygonFiles = {
    importPolygons: () => files.importPolygons(),
    exportDocument: document => files.exportDocument({ document })
  }
}

// No navegador, os mesmos documentos JSON usam o seletor de arquivo e downloads.
if (!window.polygonFiles) {
  window.polygonFiles = {
    importPolygons: () => new Promise(resolve => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json,.geojson,application/json,application/geo+json'
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
    exportDocument: async value => {
      try {
        const geojson = 'type' in value
        const normalized = validatePolygonDocument(value)
        const content = JSON.stringify(createExportDocument(normalized, geojson ? 'geojson' : 'json'), null, 2) + '\n'
        const blob = new Blob([content], { type: geojson ? 'application/geo+json' : 'application/json' })
        if (blob.size > maxPolygonFileBytes) throw new Error('A exportação excede o limite de 10 MB.')
        const fileName = geojson ? 'mapa.geojson' : 'mapa.json'
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
