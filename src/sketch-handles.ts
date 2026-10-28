import type SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol.js'
// O SDK não expõe o tamanho das alças no SketchViewModel público. Isolar a
// adaptação dos símbolos de reshape da versão instalada e validar no navegador.
// @ts-expect-error O módulo interno do ArcGIS não publica declarações TypeScript.
import { defaultSymbols } from '@arcgis/core/views/draw/support/reshapeUtils.js'

const symbols = defaultSymbols as Record<'vertices' | 'midpoints', Record<string, SimpleMarkerSymbol>>
for (const [state, size] of Object.entries({ default: 12, hover: 15, selected: 12 })) {
  const symbol = symbols.vertices[state].clone()
  symbol.size = size // Padrão do SDK: 8 / 10 / 8 pontos. Aumento de 50% no diâmetro.
  symbols.vertices[state] = symbol
}
for (const state of ['default', 'hover']) {
  const symbol = symbols.midpoints[state].clone()
  symbol.size = 9 // Padrão do SDK: 6 pontos.
  symbols.midpoints[state] = symbol
}
