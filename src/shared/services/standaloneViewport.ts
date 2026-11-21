/** Usa a altura útil quando o iOS já reserva a barra de status fora do viewport. */
export function startStandaloneViewport() {
  const root = document.documentElement
  if (!root.classList.contains('ios-standalone')) return () => {}
  let restingHeight = window.innerHeight
  let restingWidth = window.innerWidth
  const previous = root.style.getPropertyValue('--valora-pwa-height')

  const sync = () => {
    const active = document.activeElement
    const editing = active instanceof HTMLElement && (active.matches('input, textarea, select') || active.isContentEditable)
    const height = window.innerHeight
    const visibleHeight = window.visualViewport?.height ?? height
    const sameWidth = window.innerWidth === restingWidth
    // A abertura do teclado não deve encolher a altura base do app.
    if (sameWidth && editing && visibleHeight < restingHeight - 120) return
    restingHeight = sameWidth ? Math.max(restingHeight, height) : height
    restingWidth = window.innerWidth

    const probe = document.createElement('div')
    probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top);width:0;height:0;'
    document.body.append(probe)
    const nativeInset = parseFloat(getComputedStyle(probe).paddingTop) || 0
    probe.remove()

    // Inset zero: a barra já fica fora da página. Não somar essa diferença no topo.
    // O 100vh do WebKit pode incluí-la mesmo assim: limitar à altura útil evita
    // que a navbar absoluta seja posicionada abaixo da região visível.
    if (nativeInset === 0 && height > 0) root.style.setProperty('--valora-pwa-height', `${height}px`)
    else root.style.removeProperty('--valora-pwa-height')
  }

  sync()
  window.addEventListener('resize', sync)
  window.addEventListener('pageshow', sync)
  window.visualViewport?.addEventListener('resize', sync)
  return () => {
    window.removeEventListener('resize', sync)
    window.removeEventListener('pageshow', sync)
    window.visualViewport?.removeEventListener('resize', sync)
    if (previous) root.style.setProperty('--valora-pwa-height', previous)
    else root.style.removeProperty('--valora-pwa-height')
  }
}
