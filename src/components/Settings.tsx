import { useLayoutEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react'
import { Check, ChevronRight, Keyboard, Monitor, Moon, Palette, Settings, Sun } from 'lucide-react'
import { useEditorContext, useShortcuts } from './EditorContext'
import { highContrastEnabled, setHighContrast, setThemePreference, subscribeTheme, themePreference, type ThemePreference } from '../theme-settings'

const themes = [
  { value: 'dark-black', label: 'Preto profundo', hint: 'Tons escuros para a interface.', Icon: Moon },
  { value: 'light', label: 'Claro', hint: 'Fundo claro e cores naturais.', Icon: Sun },
  { value: 'system', label: 'Sistema', hint: 'Acompanha o tema do dispositivo.', Icon: Monitor }
] as const
const pages = [
  { id: 'appearance', label: 'Aparência', hint: 'Tema e contraste', Icon: Palette },
  { id: 'shortcuts', label: 'Atalhos', hint: 'Teclas e comandos', Icon: Keyboard }
] as const
const compactLayout = matchMedia('(max-width: 720px)')
function subscribeLayout(listener: () => void) {
  compactLayout.addEventListener('change', listener)
  return () => compactLayout.removeEventListener('change', listener)
}
function isCompactLayout() { return compactLayout.matches }
const shortcuts: [string, string][] = [
  ['L', 'Focar a listagem aberta'], ['← / →', 'Alternar entre Áreas, Pontos e Avisos no menu, fora da criação/edição'], ['P', 'Novo ponto'], ['N', 'Abrir criação e escolher Área ou Ponto'], ['↑ / ↓', 'Trocar a seleção na lista aberta'], ['↑ / ↓ / ← / →', 'Navegar nos modais'],
  ['E / Enter', 'Editar a seleção'], ['D', 'Na lista, excluir com confirmação'], ['C', 'Clonar a seleção'], ['T', 'Travar / destravar'],
  ['Enter', 'Concluir criação ou edição'], ['Esc', 'Cancelar e descartar a criação/edição; fora dela, limpar a seleção'],
  ['Delete', 'Remover vértices selecionados; sem seleção, confirmar exclusão da área ou ponto (também Backspace)'],
  ['1 – 9 / 0', 'Escolher a cor durante a criação/edição (0 seleciona branco)'], ['Z / Ctrl/⌘ Z', 'Desfazer'], ['R / Ctrl/⌘ ⇧ Z', 'Refazer (também Ctrl/⌘ Y)'],
  ['+ / −', 'Aumentar / diminuir zoom'], ['H', 'Retornar o norte para cima'], ['← / → na bússola', 'Girar o mapa em passos de 15° com a bússola em foco'], ['M', 'Separar mapa; no mapa separado, focar menu; no menu separado, reunir telas']
]
const shortcutColumnSize = Math.ceil(shortcuts.length / 2)
const shortcutColumns = [shortcuts.slice(0, shortcutColumnSize), shortcuts.slice(shortcutColumnSize)]

export function SettingsContent() {
  const { state } = useEditorContext()
  const [page, setPage] = useState<typeof pages[number]['id']>('appearance')
  const compact = useSyncExternalStore(subscribeLayout, isCompactLayout)
  const content = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => { content.current?.scrollTo({ top: 0 }) }, [page])
  function navigatePages(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const index = pages.findIndex(item => item.id === page)
    let next: number
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % pages.length
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index + pages.length - 1) % pages.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = pages.length - 1
    else return
    event.preventDefault()
    event.stopPropagation()
    setPage(pages[next].id)
    document.getElementById(`settings-tab-${pages[next].id}`)?.focus()
  }
  if (compact) return <div ref={content} className="mobile-settings-content">
    <ThemeSelector compact />
    <footer className="mobile-settings-footer">
      <p className="settings-save-status"><Check aria-hidden="true" />Alterações salvas automaticamente</p>
      <p className="settings-map-status" role="status" data-ready={state.ready}>{state.ready ? 'Mapa ativo' : 'Aguardando o mapa'}</p>
    </footer>
  </div>
  return <div className="settings-layout">
    <div className="settings-navigation">
      <p className="settings-navigation-label">Preferências</p>
      <div className="settings-tabs" role="tablist" aria-label="Categorias de configuração" aria-orientation={compact ? 'horizontal' : 'vertical'} onKeyDown={navigatePages}>
        {pages.map(({ id, label, hint, Icon }) => <button key={id} id={`settings-tab-${id}`} role="tab" type="button"
          aria-selected={page === id} aria-controls={`settings-panel-${id}`} tabIndex={page === id ? 0 : -1} onClick={() => setPage(id)}>
          <Icon aria-hidden="true" /><span><strong>{label}</strong><small>{hint}</small></span><ChevronRight className="settings-nav-arrow" aria-hidden="true" />
        </button>)}
      </div>
      <p className="settings-save-status"><Check aria-hidden="true" /><span>Alterações salvas automaticamente</span></p>
    </div>
    <div ref={content} className="settings-content">
      {pages.map(({ id }) => <div key={id} id={`settings-panel-${id}`} className="settings-page" role="tabpanel" tabIndex={0}
        aria-labelledby={`settings-tab-${id}`} hidden={page !== id}>
        {id === 'appearance' ? <ThemeSelector /> : <KeyboardSettings />}
      </div>)}
    </div>
  </div>
}

function ThemeSelector({ compact = false }: { compact?: boolean }) {
  const selected = useSyncExternalStore(subscribeTheme, themePreference)
  return <section aria-labelledby="appearance-title">
    <div className="settings-page-heading"><h3 id="appearance-title">Aparência</h3><p>{compact ? 'Escolha o tema e ajuste a leitura.' : 'Escolha o visual que combina com você.'}</p></div>
    <fieldset className="theme-options" aria-describedby="theme-description">
      <legend className="settings-field-label">Tema do aplicativo</legend>
      {themes.map(({ value, label, hint, Icon }) => <label key={value} className={`theme-option theme-option-${value}`}>
        <input type="radio" name="app-theme" value={value} checked={selected === value}
          onChange={event => setThemePreference(event.target.value as ThemePreference)} />
        {!compact && <span className={`theme-preview theme-preview-${value}`} aria-hidden="true"><span className="theme-preview-sidebar"><i /><i /><i /></span><span className="theme-preview-map"><i /><i /></span></span>}
        <span className="theme-option-label"><Icon aria-hidden="true" /><span className="theme-option-copy"><span>{label}</span>{compact && <small>{hint}</small>}</span><Check className="theme-option-check" aria-hidden="true" /></span>
      </label>)}
    </fieldset>
    <p className={`settings-note${compact ? ' visually-hidden' : ''}`} id="theme-description">No modo Sistema, o tema acompanha a aparência do seu dispositivo.</p>
    <HighContrastSetting />
  </section>
}

function HighContrastSetting() {
  const enabled = useSyncExternalStore(subscribeTheme, highContrastEnabled)
  return <div className="settings-preference-row settings-appearance-contrast">
      <div><h4>Alto contraste</h4><p id="contrast-description">Reforça textos, bordas e indicadores nos temas claro e escuro.</p></div>
      <label className="settings-toggle">
        <input id="high-contrast-enabled" type="checkbox" role="switch" aria-label="Alto contraste" aria-describedby="contrast-description"
          checked={enabled} onChange={event => setHighContrast(event.target.checked)} />
      </label>
  </div>
}

function KeyboardSettings() {
  const { enabled, setEnabled } = useShortcuts()
  const reference = <>
    <div className="keyboard-shortcuts-columns">{shortcutColumns.map((column, index) => <dl key={index} className="keyboard-shortcuts-list">
      {column.map(([key, description]) => <Shortcut key={key} name={key} description={description} />)}
    </dl>)}</div>
    <p className="settings-note">Os atalhos funcionam fora dos campos de texto. Enter confirma. Esc cancela e descarta as alterações diretamente, também no campo de nome.</p>
  </>
  return <section aria-labelledby="keyboard-shortcuts-title">
    <div className="settings-page-heading">
      <div className="settings-title-row"><h3 id="keyboard-shortcuts-title">Atalhos de teclado</h3>
        <label className="settings-toggle"><input id="keyboard-shortcuts-enabled" data-shortcuts-toggle type="checkbox" role="switch"
          aria-label="Habilitar atalhos de teclado" aria-describedby="shortcuts-description" checked={enabled} onChange={event => setEnabled(event.target.checked)} /></label>
      </div>
      <p id="shortcuts-description">Ativa os comandos e exibe as teclas nos botões correspondentes.</p>
    </div>
    <h4 className="settings-subheading">Referência rápida<span>{shortcuts.length} atalhos</span></h4>{reference}
  </section>
}
function Shortcut({ name, description }: { name: string; description: string }) { return <><dt><kbd>{name}</kbd></dt><dd>{description}</dd></> }

export function SettingsButton({ open }: { open(): void }) {
  const { state } = useEditorContext()
  return <button id="open-settings" className="secondary icon-button settings-button" type="button" aria-label="Configurações"
    aria-haspopup="dialog" aria-controls="settings-dialog" title="Configurações" hidden={Boolean(state.action)} onClick={open}><Settings aria-hidden="true" /></button>
}
