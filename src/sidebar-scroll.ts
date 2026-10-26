// Uma barra própria permanece visível mesmo quando o sistema oculta barras nativas.
export function attachSidebarScrollbar(viewport: HTMLElement, track: HTMLElement) {
  const thumb = track.firstElementChild as HTMLElement
  let pointer: number | null = null
  let grabOffset = 0

  function update() {
    const height = track.clientHeight
    const maximum = Math.max(0, viewport.scrollHeight - viewport.clientHeight)
    const thumbHeight = Math.min(height, Math.max(28, height * viewport.clientHeight / Math.max(1, viewport.scrollHeight)))
    thumb.style.height = `${thumbHeight}px`
    thumb.style.transform = `translateY(${maximum ? viewport.scrollTop / maximum * (height - thumbHeight) : 0}px)`
    track.setAttribute('aria-valuemax', String(maximum))
    track.setAttribute('aria-valuenow', String(Math.round(viewport.scrollTop)))
    track.setAttribute('aria-disabled', String(maximum === 0))
    track.tabIndex = maximum ? 0 : -1
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
  })
  track.addEventListener('pointermove', (event) => {
    if (event.pointerId === pointer) move(event.clientY)
  })
  track.addEventListener('lostpointercapture', () => { pointer = null })
  track.addEventListener('pointerup', () => { pointer = null })
  track.addEventListener('pointercancel', () => { pointer = null })
  track.addEventListener('keydown', (event) => {
    const amount = { ArrowDown: 40, ArrowUp: -40, PageDown: viewport.clientHeight, PageUp: -viewport.clientHeight, Home: -viewport.scrollHeight, End: viewport.scrollHeight }[event.key]
    if (amount === undefined) return
    event.preventDefault()
    event.stopPropagation()
    viewport.scrollTop += amount
    update()
  })
  viewport.addEventListener('scroll', update, { passive: true })
  const observer = new ResizeObserver(update)
  observer.observe(viewport)
  Array.from(viewport.children).forEach((child) => observer.observe(child))
  update()
}
