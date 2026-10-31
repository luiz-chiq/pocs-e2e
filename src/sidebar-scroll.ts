// O espaço da barra fica reservado; a barra só aparece quando há conteúdo para rolar.
export function attachSidebarScrollbar(viewport: HTMLElement, track: HTMLElement) {
  const lifetime = new AbortController()
  const signal = lifetime.signal
  const thumb = track.firstElementChild as HTMLElement
  let pointer: number | null = null
  let grabOffset = 0
  let frame: number | null = null

  function update() {
    const height = track.clientHeight
    const maximum = Math.max(0, viewport.scrollHeight - viewport.clientHeight)
    const thumbHeight = Math.min(height, Math.max(28, height * viewport.clientHeight / Math.max(1, viewport.scrollHeight)))
    thumb.style.height = `${thumbHeight}px`
    thumb.style.transform = `translateY(${maximum ? viewport.scrollTop / maximum * (height - thumbHeight) : 0}px)`
    track.setAttribute('aria-valuemax', String(maximum))
    track.setAttribute('aria-valuenow', String(Math.round(viewport.scrollTop)))
    track.setAttribute('aria-disabled', String(maximum === 0))
    track.setAttribute('aria-hidden', String(maximum === 0))
    track.tabIndex = maximum ? 0 : -1
    if (!maximum && document.activeElement === track) viewport.focus({ preventScroll: true })
  }

  function scheduleUpdate() {
    if (frame !== null) return
    frame = requestAnimationFrame(() => { frame = null; update() })
  }

  function move(clientY: number) {
    const maximum = Math.max(0, viewport.scrollHeight - viewport.clientHeight)
    const distance = track.clientHeight - thumb.offsetHeight
    if (distance > 0) viewport.scrollTop = Math.max(0, Math.min(maximum, (clientY - track.getBoundingClientRect().top - grabOffset) / distance * maximum))
    update()
  }

  track.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || viewport.scrollHeight <= viewport.clientHeight) return
    event.preventDefault()
    pointer = event.pointerId
    grabOffset = event.target === thumb ? event.clientY - thumb.getBoundingClientRect().top : thumb.offsetHeight / 2
    track.setPointerCapture(event.pointerId)
    track.focus({ preventScroll: true })
    move(event.clientY)
  }, { signal })
  track.addEventListener('pointermove', (event) => {
    if (event.pointerId === pointer) move(event.clientY)
  }, { signal })
  track.addEventListener('lostpointercapture', () => { pointer = null }, { signal })
  track.addEventListener('pointerup', () => { pointer = null }, { signal })
  track.addEventListener('pointercancel', () => { pointer = null }, { signal })
  track.addEventListener('keydown', (event) => {
    const amount = { ArrowDown: 40, ArrowUp: -40, PageDown: viewport.clientHeight, PageUp: -viewport.clientHeight, Home: -viewport.scrollHeight, End: viewport.scrollHeight }[event.key]
    if (amount === undefined) return
    event.preventDefault()
    event.stopPropagation()
    viewport.scrollTop += amount
    update()
  }, { signal })
  viewport.addEventListener('scroll', update, { passive: true, signal })
  const observer = new ResizeObserver(scheduleUpdate)
  observer.observe(viewport)
  observer.observe(track)
  const children = new Set<Element>()
  function observeContent() {
    const current = new Set(viewport.children)
    for (const child of children) {
      if (!current.has(child)) { observer.unobserve(child); children.delete(child) }
    }
    for (const child of current) {
      if (!children.has(child)) { observer.observe(child); children.add(child) }
    }
    scheduleUpdate()
  }
  // Trocas de aba, expansão de cards e avisos podem substituir o conteúdo.
  const contentObserver = new MutationObserver(observeContent)
  contentObserver.observe(viewport, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'class', 'style'] })
  observeContent()
  update()
  return () => {
    lifetime.abort()
    observer.disconnect()
    contentObserver.disconnect()
    if (frame !== null) cancelAnimationFrame(frame)
  }
}
