import { Capacitor } from '@capacitor/core'

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const installButton = document.querySelector<HTMLButtonElement>('#install-app')!
const installDialog = document.querySelector<HTMLDialogElement>('#install-dialog')!
const installDescription = document.querySelector<HTMLParagraphElement>('#install-dialog-description')!
const standalone = window.matchMedia('(display-mode: standalone)')
const iosNavigator = navigator as Navigator & { standalone?: boolean }
const nativeApp = Capacitor.isNativePlatform() || /\bElectron\//i.test(navigator.userAgent) || location.protocol === 'file:'
let deferredPrompt: InstallPromptEvent | null = null
let installed = false

function updateInstallButton() {
  installButton.hidden = nativeApp || installed || standalone.matches || iosNavigator.standalone === true
}

function showInstallHelp(text?: string) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  installDescription.textContent = text ?? (!window.isSecureContext
    ? 'Para instalar o aplicativo, acesse este site por HTTPS. No desenvolvimento, use localhost.'
    : isIOS
      ? 'No iPhone ou iPad, abra este site no Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”. Confirme em “Adicionar”.'
      : 'No Chrome ou Edge, procure “Instalar aplicativo” no menu do navegador ou o ícone de instalação na barra de endereço. No Safari do Mac, use Arquivo → Adicionar ao Dock. Se a opção ainda não aparecer, aguarde o carregamento e tente novamente.')
  if (!installDialog.open) installDialog.showModal()
}

window.addEventListener('beforeinstallprompt', (event) => {
  if (nativeApp) return
  event.preventDefault()
  deferredPrompt = event as InstallPromptEvent
  updateInstallButton()
})

window.addEventListener('appinstalled', () => {
  installed = true
  deferredPrompt = null
  installDialog.close()
  updateInstallButton()
})
standalone.addEventListener('change', updateInstallButton)

// Simulação intencional: somente o toque ativa a instalação; mouse, caneta e teclado são ignorados.
installButton.addEventListener('pointerup', async (event) => {
  if (event.pointerType !== 'touch' || installButton.disabled) return
  if (!deferredPrompt) {
    showInstallHelp()
    return
  }

  const prompt = deferredPrompt
  deferredPrompt = null
  installButton.disabled = true
  try {
    await prompt.prompt()
    const choice = await prompt.userChoice
    if (choice.outcome === 'accepted') {
      installed = true
      updateInstallButton()
    }
  } catch {
    showInstallHelp('Não foi possível abrir a instalação. Tente instalar pelo menu do navegador ou recarregue a página e tente novamente.')
  } finally {
    installButton.disabled = false
  }
})

updateInstallButton()
