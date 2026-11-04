import { polygonPalette } from './polygon-rules'

export interface ShortcutKeyEvent {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  shiftKey: boolean
}
interface Binding {
  key: string
  primary?: boolean
  shift?: boolean
  step?: number
  value?: string
}
interface Definition {
  bindings: readonly Binding[]
  description: string
  aliases?: readonly Binding[]
  label?: string
  context?: string
  sketch?: boolean
  allowModifiers?: boolean
}

// Teclas, aliases e textos ficam juntos. Os consumidores só escolhem o contexto.
const enterBinding = { key: 'Enter' } as const
const definitions = {
  focusLists: { bindings: [{ key: 'l' }], description: 'Focar a listagem aberta' },
  listTabs: { bindings: [{ key: 'ArrowLeft', step: -1 }, { key: 'ArrowRight', step: 1 }], description: 'Alternar entre Áreas, Pontos e Avisos no menu, fora da criação/edição' },
  createPoint: { bindings: [{ key: 'p' }], description: 'Novo ponto' },
  create: { bindings: [{ key: 'n' }], description: 'Abrir criação e escolher Área ou Ponto' },
  listItems: { bindings: [{ key: 'ArrowUp', step: -1 }, { key: 'ArrowDown', step: 1 }], description: 'Navegar entre os itens da lista aberta' },
  dialogNavigation: { bindings: [{ key: 'ArrowUp', step: -1 }, { key: 'ArrowDown', step: 1 }, { key: 'ArrowLeft', step: -1 }, { key: 'ArrowRight', step: 1 }], description: 'Navegar nos modais' },
  edit: { bindings: [{ key: 'e' }], aliases: [enterBinding], description: 'Editar a seleção individual' },
  deleteListItem: { bindings: [{ key: 'd' }], description: 'Na lista, excluir um item com confirmação, fora da seleção múltipla' },
  clone: { bindings: [{ key: 'c' }], description: 'Clonar a seleção individual' },
  lock: { bindings: [{ key: 't' }], description: 'Travar / destravar' },
  confirm: { bindings: [enterBinding], description: 'Concluir criação ou edição', sketch: true },
  cancel: { bindings: [{ key: 'Escape' }], description: 'Cancelar e descartar a criação/edição; fora dela, limpar a seleção ou sair da seleção múltipla', sketch: true },
  remove: { bindings: [{ key: 'Delete' }, { key: 'Backspace' }], description: 'Remover vértices selecionados; sem seleção, confirmar exclusão da área ou ponto', sketch: true, allowModifiers: true },
  color: { bindings: polygonPalette.map(([, color, key]) => ({ key, value: color, shift: false })), label: '1 – 9 / 0', description: 'Escolher a cor durante a criação/edição (0 seleciona branco)', sketch: true },
  undo: { bindings: [{ key: 'z' }, { key: 'z', primary: true, shift: false }], description: 'Desfazer', sketch: true },
  redo: { bindings: [{ key: 'r' }, { key: 'z', primary: true, shift: true }, { key: 'y', primary: true }], description: 'Refazer', sketch: true },
  zoomIn: { bindings: [{ key: '+' }, { key: '=' }], description: 'Aumentar zoom', sketch: true },
  zoomOut: { bindings: [{ key: '-' }], description: 'Diminuir zoom', sketch: true },
  north: { bindings: [{ key: 'h' }], description: 'Retornar o norte para cima', sketch: true },
  compassRotate: { bindings: [{ key: 'ArrowLeft', step: -1 }, { key: 'ArrowRight', step: 1 }], context: 'na bússola', description: 'Girar o mapa em passos de 15° com a bússola em foco' },
  mapWindow: { bindings: [{ key: 'm' }], description: 'Separar mapa; no mapa separado, focar menu; no menu separado, reunir telas' },
  firstTab: { bindings: [{ key: 'Home' }], description: 'Ir para a primeira aba' },
  lastTab: { bindings: [{ key: 'End' }], description: 'Ir para a última aba' },
  controlFocus: { bindings: [{ key: 'Tab', shift: false }, { key: 'Tab', shift: true }], description: 'Mover o foco entre os controles' }
} satisfies Record<string, Definition>

export type ShortcutId = keyof typeof definitions
function definition(id: ShortcutId): Definition { return definitions[id] }

export function shortcutBinding(id: ShortcutId, event: ShortcutKeyEvent): Binding | undefined {
  const item = definition(id)
  return item.bindings.find(binding => binding.key.toLowerCase() === event.key.toLowerCase() &&
    (item.allowModifiers || (!event.altKey && Boolean(binding.primary) === (event.ctrlKey || event.metaKey))) &&
    (binding.shift === undefined || binding.shift === event.shiftKey))
}

const keyLabels: Record<string, string> = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Escape: 'Esc', '-': '−' }
function bindingLabel(binding: Binding) {
  return `${binding.primary ? 'Ctrl/⌘ ' : ''}${binding.shift ? (binding.primary ? '⇧ ' : 'Shift + ') : ''}${keyLabels[binding.key] ?? (binding.key.length === 1 ? binding.key.toUpperCase() : binding.key)}`
}
function allBindings(id: ShortcutId) {
  const item = definition(id)
  return [...item.bindings, ...(item.aliases ?? [])]
}
export function shortcutLabel(id: ShortcutId) {
  return definition(id).label ?? [...new Set(allBindings(id).map(bindingLabel))].join(' / ')
}
export function shortcutBadge(id: ShortcutId, index = 0) {
  const binding = definition(id).bindings[index]
  return binding ? bindingLabel(binding) : undefined
}
export function shortcutKey(id: ShortcutId, index = 0) {
  return definition(id).bindings[index].key
}
export function shortcutAriaKeys(...ids: ShortcutId[]) {
  return [...new Set(ids.flatMap(id => allBindings(id).flatMap(binding => {
    const key = binding.key.length === 1 ? binding.key.toUpperCase() : binding.key
    const suffix = `${binding.shift ? 'Shift+' : ''}${key}`
    return binding.primary ? [`Control+${suffix}`, `Meta+${suffix}`] : [suffix]
  })))].join(' ')
}
export function colorShortcutKey(color: string) {
  return definition('color').bindings.find(binding => binding.value === color)?.key
}
export function isSketchShortcut(event: ShortcutKeyEvent) {
  return (Object.keys(definitions) as ShortcutId[]).some(id => definition(id).sketch && shortcutBinding(id, event))
}

const referenceGroups: { ids: ShortcutId[]; description?: string }[] = [
  ...(['focusLists', 'listTabs', 'createPoint', 'create', 'listItems', 'dialogNavigation', 'edit', 'deleteListItem', 'clone', 'lock',
    'confirm', 'cancel', 'remove', 'color', 'undo', 'redo'] as const).map(id => ({ ids: [id] })),
  { ids: ['zoomIn', 'zoomOut'], description: 'Aumentar / diminuir zoom' },
  { ids: ['north'] }, { ids: ['compassRotate'] }, { ids: ['mapWindow'] },
  { ids: ['firstTab', 'lastTab'], description: 'Ir para a primeira / última aba' }, { ids: ['controlFocus'] }
]
export const shortcutReference = referenceGroups.map(group => ({
  id: group.ids.join(':'),
  label: group.ids.map(id => `${shortcutLabel(id)}${definition(id).context ? ` (${definition(id).context})` : ''}`).join(' / '),
  description: group.description ?? definition(group.ids[0]).description
}))

shortcutReference.push({ id: 'multiSelection', label: 'Shift + clique', description: 'Adicionar ou remover uma área ou ponto da seleção múltipla na lista' })
