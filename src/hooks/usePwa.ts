import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Capacitor } from '@capacitor/core'
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
const nativeApp = Capacitor.isNativePlatform() || /\bElectron\//i.test(navigator.userAgent) || location.protocol === 'file:'
function helpText() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return !window.isSecureContext ? 'Para instalar o aplicativo, acesse este site por HTTPS. No desenvolvimento, use localhost.'
    : ios ? 'No iPhone ou iPad, abra este site no Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”. Confirme em “Adicionar”.'
      : 'No Chrome ou Edge, procure “Instalar aplicativo” no menu do navegador ou o ícone de instalação na barra de endereço. No Safari do Mac, use Arquivo → Adicionar ao Dock. Se a opção ainda não aparecer, aguarde o carregamento e tente novamente.'
}
function isInstalled() { return matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true }
export function usePwa() {
  const prompt = useRef<InstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isInstalled)
  const [busy, setBusy] = useState(false)
  const [description, setDescription] = useState('')
  useEffect(() => {
    const lifetime = new AbortController()
    const options = { signal: lifetime.signal }
    window.addEventListener('beforeinstallprompt', event => {
      if (nativeApp) return
      event.preventDefault()
      prompt.current = event as InstallPromptEvent
    }, options)
    window.addEventListener('appinstalled', () => { setInstalled(true); prompt.current = null; setDescription('') }, options)
    const standalone = matchMedia('(display-mode: standalone)')
    standalone.addEventListener('change', () => setInstalled(isInstalled()), options)
    return () => lifetime.abort()
  }, [])
  async function install(event: PointerEvent<HTMLButtonElement>) {
    // A instalação responde somente a interações por toque.
    if (event.pointerType !== 'touch' || busy) return
    const deferred = prompt.current
    if (!deferred) { setDescription(helpText()); return }
    prompt.current = null
    setBusy(true)
    try {
      await deferred.prompt()
      const result = await deferred.userChoice
      if (result.outcome === 'accepted') setInstalled(true)
    } catch { setDescription('Não foi possível abrir a instalação. Tente instalar pelo menu do navegador ou recarregue a página e tente novamente.') }
    finally { setBusy(false) }
  }
  return { visible: !nativeApp && !installed, busy, description, install, close: () => setDescription('') }
}
export type PwaState = ReturnType<typeof usePwa>
