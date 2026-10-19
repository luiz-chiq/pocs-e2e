// Compartilhar dados e contratos; cada POC implementa seus próprios gestos e esperas.
export const appUrl = process.env.BASE_URL ?? 'https://poc-e2e.chiquetano.com.br/'
export const target = process.env.POC_TARGET ?? 'web'
if (!['web', 'pwa', 'electron', 'android'].includes(target)) throw new Error(`POC_TARGET inválido: ${target}`)
export const isWeb = target === 'web'
export const isPwa = target === 'pwa'
export const isElectron = target === 'electron'
export const isAndroid = target === 'android'
export const nativeUrl = isElectron ? 'poligonos://app/' : appUrl
export const viewport = { width: 1280, height: 800 }
export const triangle: Array<[number, number]> = [[-120, -50], [0, -50], [-60, 50]]
export const cases = {
  create: 'C01 cria um polígono válido com três vértices e rótulo',
  invalid: 'C02 bloqueia desenhos vazios, incompletos e sem área',
  select: 'C03 seleciona sem editar e permite edição por Enter ou botão',
  edit: 'C04 move a área, arrasta um vértice, insere outro e salva',
  name: 'C05 valida nomes, acentos e limite de trinta caracteres',
  cancel: 'C06 cancela alterações de nome e geometria',
  persist: 'C07 preserva nome e geometria ao fechar e reabrir a aplicação',
  delete: 'C08 confirma e cancela exclusões por Delete, individuais e de todos',
  navigation: 'C09 aplica zoom, gira a bússola e retorna ao norte',
  mouse: 'C10 mouse deve abrir as instruções de instalação',
  touch: 'C10 touch deve abrir as instruções de instalação'
}
export const dualCases = {
  sync: 'D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas',
  reuniteMain: 'D02 reúne pela principal e separa novamente sem duplicar dados',
  reuniteMap: 'D02 reúne pelo mapa e separa novamente sem duplicar dados',
  close: 'D03 fecha o mapa com edição pendente e recupera o último estado salvo'
}
export const s = {
  map: '[data-testid="arcgis-map"]',
  ready: '[data-testid="map-ready"]',
  items: '[data-testid="polygon-item"]',
  label: '.polygon-label',
  mapLabel: '[data-testid="polygon-map-label"]',
  vertices: '.vertex-list li',
  vertexList: '.vertex-list',
  draw: '[data-testid="draw-polygon"]',
  finish: '[data-testid="finish-drawing"]',
  cancel: '[data-testid="cancel-editing"]',
  name: '[data-testid="polygon-name"]',
  instructions: '#map-instructions',
  remove: '[data-testid="delete-polygon"]',
  dismissClear: '#dismiss-clear',
  deletedDialog: '#deleted-edit-dialog',
  confirmDeleted: '#confirm-deleted-edit',
  restoreDeleted: '#restore-deleted-edit',
  mapSurface: '#map .esri-view-surface',
  zoomIn: '[data-testid="zoom-in"]',
  zoomOut: '[data-testid="zoom-out"]',
  compass: '[data-testid="north-up"]',
  needle: '.north-indicator',
  clear: '[data-testid="clear-polygons"]',
  confirmClear: '#confirm-clear',
  lastEdit: '[data-testid="last-edit"]',
  install: '[data-testid="install-app"]',
  installDialog: '#install-dialog',
  detach: '[data-testid="detach-map"]',
  reunite: '[data-testid="reunite-windows"]',
  returnMap: '[data-testid="return-map"]',
  connection: '#connection-status'
}
export type Point = { x: number; y: number }
export type ScreenPoints = { center: Point; vertices: Point[]; edgeMidpoint: Point }
export type InstallInput = { pointerType: string; isTrusted: boolean }
export type PocWindow = Window & {
  pocMapInputs?: Array<{ pointerType: string; x: number; y: number; inMap: boolean; isTrusted: boolean }>
  polygonTestApi?: {
    getSelectedScreenPoints(): ScreenPoints
    waitForPersistence(): Promise<void>
    getDrawingState?(): { ready: boolean; vertices: number }
  }
  pocInstallInputs?: InstallInput[]
}

// Apenas C10: tornar determinístico o caminho "sem oferta nativa de instalação".
// Suprime a oferta do navegador antes de chegar ao app. Não troca handlers do app,
// não dispara eventos sintéticos e não simula uma instalação concluída.
export const installFixture = `(() => {
  if (!new URL(location.href).searchParams.has('pocInstall')) return;
  window.pocInstallInputs = [];
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  document.addEventListener('pointerup', event => {
    if (event.target instanceof Element && event.target.closest('[data-testid="install-app"]')) {
      window.pocInstallInputs.push({ pointerType: event.pointerType, isTrusted: event.isTrusted });
    }
  }, true);
})();`

export function installUrl() {
  const url = new URL(appUrl)
  url.searchParams.set('pocInstall', '1')
  return url.href
}
