interface CompassOptions {
  getRotation(): number
  setRotation(rotation: number): void
  resetNorth(): void
  stopAnimation(): void
  onChange(): void
}

export function attachCompass(button: HTMLButtonElement, options: CompassOptions) {
  let drag: {
    pointerId: number
    x: number
    y: number
    centerX: number
    centerY: number
    rotation: number
    angle: number
    delta: number
    circular: boolean
    moved: boolean
  } | null = null
  let suppressPointerClick = false

  button.addEventListener('pointerdown', (event) => {
    if (button.disabled || event.button !== 0 || drag) return
    const box = button.getBoundingClientRect()
    const centerX = box.left + box.width / 2
    const centerY = box.top + box.height / 2
    drag = {
      pointerId: event.pointerId, x: event.clientX, y: event.clientY,
      centerX, centerY, rotation: options.getRotation(),
      angle: Math.atan2(event.clientY - centerY, event.clientX - centerX),
      delta: 0, circular: Math.hypot(event.clientX - centerX, event.clientY - centerY) >= 6,
      moved: false
    }
    suppressPointerClick = false
    button.setPointerCapture(event.pointerId)
  })

  button.addEventListener('pointermove', (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return
    if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 4) return
    event.preventDefault()
    if (!drag.moved) {
      options.stopAnimation()
      drag.moved = true
      button.classList.add('is-dragging')
    }
    if (drag.circular) {
      if (Math.hypot(event.clientX - drag.centerX, event.clientY - drag.centerY) < 4) return
      const angle = Math.atan2(event.clientY - drag.centerY, event.clientX - drag.centerX)
      // Evita saltos ao atravessar o limite entre -180° e 180°.
      const delta = Math.atan2(Math.sin(angle - drag.angle), Math.cos(angle - drag.angle))
      drag.delta += delta * 180 / Math.PI
      drag.angle = angle
    } else {
      // Arrastar a partir do centro da agulha também funciona horizontalmente.
      drag.delta = event.clientX - drag.x
    }
    options.setRotation(((drag.rotation + drag.delta) % 360 + 360) % 360)
  })

  function finishDrag(event: PointerEvent) {
    if (!drag || drag.pointerId !== event.pointerId) return
    suppressPointerClick = drag.moved
    const changed = drag.moved
    drag = null
    button.classList.remove('is-dragging')
    if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId)
    if (changed) options.onChange()
  }
  button.addEventListener('pointerup', finishDrag)
  button.addEventListener('pointercancel', finishDrag)
  button.addEventListener('lostpointercapture', finishDrag)

  button.addEventListener('click', (event) => {
    // Soltar a agulha depois de girar não deve acionar o retorno ao norte.
    if (event.detail > 0 && suppressPointerClick) {
      suppressPointerClick = false
      event.preventDefault()
      return
    }
    suppressPointerClick = false
    options.resetNorth()
  })

  button.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      options.stopAnimation()
      const delta = event.key === 'ArrowLeft' ? -15 : 15
      options.setRotation((options.getRotation() + delta + 360) % 360)
      options.onChange()
    } else if (event.key === 'Home') {
      event.preventDefault()
      options.resetNorth()
    }
  })
}
