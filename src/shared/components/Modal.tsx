import { KeyboardEvent, ReactNode, useCallback, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  isOpen: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** ações sempre visíveis abaixo da área rolável (ex.: formulário no mobile). */
  footer?: ReactNode
  /**
   * `false` bloqueia Escape, clique no overlay e o botão de fechar. Existe para
   * o intervalo em que uma escrita está em voo: fechar no meio desmonta quem
   * dispara a revalidação e o feedback de sucesso, e a linha gravada só
   * apareceria no próximo carregamento.
   */
  dismissible?: boolean
  variant?: 'default' | 'wallet' | 'score' | 'transaction'
  closing?: boolean
  initialFocusSelector?: string
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/** Impede o rubber band da página sem bloquear a rolagem interna do painel. */
function lockDocumentTouchScroll() {
  let lastY = 0
  const onStart = (event: TouchEvent) => { lastY = event.touches[0]?.clientY ?? 0 }
  const onMove = (event: TouchEvent) => {
    if (event.touches.length !== 1) return
    const currentY = event.touches[0].clientY
    const delta = lastY - currentY
    lastY = currentY
    let element = event.target instanceof Element ? event.target : null
    while (element && element !== document.body && element !== document.documentElement) {
      const style = getComputedStyle(element)
      const max = element.scrollHeight - element.clientHeight
      if (/(auto|scroll)/.test(style.overflowY) && max > 0 &&
        ((delta < 0 && element.scrollTop > 0) || (delta > 0 && element.scrollTop < max - 1))) return
      element = element.parentElement
    }
    if (event.cancelable) event.preventDefault()
  }
  document.addEventListener('touchstart', onStart, { passive: true })
  document.addEventListener('touchmove', onMove, { passive: false })
  return () => {
    document.removeEventListener('touchstart', onStart)
    document.removeEventListener('touchmove', onMove)
  }
}

/**
 * Diálogo modal acessível: renderizado em portal no `body`, com `role="dialog"`
 * e `aria-modal`, foco preso enquanto aberto, Escape e clique no overlay
 * fechando, e foco devolvido ao elemento que o abriu.
 *
 * Não usa `<dialog>` nativo porque o suporte a estilização do backdrop ainda
 * é irregular e o fechamento nativo por Escape escapa ao controle do React.
 */
export function Modal({ isOpen, title, onClose, children, footer, dismissible = true, variant = 'default', closing = false, initialFocusSelector }: ModalProps) {
  const isSheet = variant === 'wallet' || variant === 'score'
  const isTransaction = variant === 'transaction'
  const dialogRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const initialFocusRef = useRef(initialFocusSelector)
  initialFocusRef.current = initialFocusSelector
  const titleId = useId()

  const getFocusable = useCallback((): HTMLElement[] => {
    const dialog = dialogRef.current
    if (!dialog) return []

    return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      // `offsetParent` nulo = elemento oculto; `tabIndex` negativo = fora da
      // ordem de tabulação por decisão do componente (ex.: opções do
      // autocomplete, navegadas por setas).
      (element) => element.offsetParent !== null && element.tabIndex >= 0,
    )
  }, [])

  // Foco inicial dentro do diálogo e devolução ao fechar.
  useEffect(() => {
    if (!isOpen) return

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null

    const focusable = getFocusable()
    const preferred = initialFocusRef.current
      ? dialogRef.current?.querySelector<HTMLElement>(initialFocusRef.current)
      : null
    const target = preferred ?? (focusable.length > 0 ? focusable[0] : dialogRef.current)
    target?.focus()

    return () => {
      previouslyFocusedRef.current?.focus()
    }
  }, [isOpen, getFocusable])

  useEffect(() => {
    if (isOpen && !closing && initialFocusSelector) {
      dialogRef.current?.querySelector<HTMLElement>(initialFocusSelector)?.focus()
    }
  }, [isOpen, closing, initialFocusSelector])

  // Impede a página de fundo de rolar sob o modal.
  useEffect(() => {
    if (!isOpen) return

    if ((isTransaction || isSheet) && window.innerWidth < 768) {
      return lockDocumentTouchScroll()
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen, isTransaction, isSheet])

  // O teclado do iOS reduz a área visível, mas 100dvh pode continuar alto.
  // Limitamos só a altura do painel; mover o overlay causa deslocamento no PWA.
  useEffect(() => {
    if (!isOpen || (variant !== 'transaction' && variant !== 'wallet' && variant !== 'score')) return
    if (window.innerWidth >= 768) return
    const viewport = window.visualViewport
    const panel = dialogRef.current
    const overlay = overlayRef.current
    if (!viewport || !panel || !overlay) return
    const syncHeight = () => {
      const standalone = document.documentElement.classList.contains('ios-standalone')
      const fullHeight = document.body.getBoundingClientRect().height
      const keyboardOpen = standalone && viewport.height < fullHeight - 120
      const availableHeight = standalone && !keyboardOpen ? fullHeight : viewport.height
      // Atualizar maxHeight diretamente força o WebKit a recalcular o painel
      // mesmo quando 100dvh e variáveis CSS ficam com o valor pré-teclado.
      panel.style.maxHeight = variant === 'transaction'
        ? `calc(${availableHeight}px - env(safe-area-inset-top) - 0.5rem)`
        : `calc(${availableHeight}px - env(safe-area-inset-top))`
      // O WebKit mantém o overlay preso ao layout viewport, atrás do teclado.
      // Reduzir apenas sua base preserva o topo e coloca as ações na borda
      // inferior do visualViewport, sem o salto causado por mudar top/height.
      const bottomInset = standalone
        ? keyboardOpen ? Math.max(0, fullHeight - viewport.height) : 0
        : Math.max(0, document.documentElement.clientHeight - viewport.offsetTop - viewport.height)
      overlay.style.bottom = `${bottomInset}px`
      if (window.scrollY !== 0) window.scrollTo(0, 0)
    }
    syncHeight()
    viewport.addEventListener('resize', syncHeight)
    viewport.addEventListener('scroll', syncHeight)
    window.addEventListener('resize', syncHeight)
    return () => {
      viewport.removeEventListener('resize', syncHeight)
      viewport.removeEventListener('scroll', syncHeight)
      window.removeEventListener('resize', syncHeight)
      panel.style.removeProperty('max-height')
      overlay.style.removeProperty('bottom')
    }
  }, [isOpen, variant])

  // Desabilitar o controle que está com o foco o joga para o `body`, e a partir
  // dali Tab volta a percorrer a página de fundo — o foco escapa do diálogo sem
  // que ninguém tenha pedido. Acontece de verdade quando `dismissible` vira
  // `false` no submit e o botão de fechar é desabilitado sob o foco do usuário.
  useEffect(() => {
    if (!isOpen) return

    const dialog = dialogRef.current
    if (!dialog) return

    const active = document.activeElement
    if (!active || active === document.body || !dialog.contains(active)) {
      dialog.focus()
    }
  }, [isOpen, dismissible])

  // Escape e Tab tratados no container do diálogo: o foco está sempre preso
  // dentro dele, e assim um filho (ex.: o autocomplete de ticker) pode
  // interceptar Escape antes com `stopPropagation`, para fechar só a própria
  // lista de sugestões em vez do modal inteiro.
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      if (dismissible) onClose()
      return
    }

    if (event.key !== 'Tab') return

    const focusable = getFocusable()
    if (focusable.length === 0) {
      event.preventDefault()
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = document.activeElement

    if (event.shiftKey && (active === first || active === dialogRef.current)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div
      ref={overlayRef}
      className={isTransaction
        ? 'transaction-modal-overlay fixed inset-0 z-50 flex items-end justify-center bg-black/75 md:items-center md:px-4 md:py-6'
        : isSheet
        ? 'wallet-modal-overlay fixed inset-0 z-50 flex items-end justify-center bg-black/70 md:items-stretch md:justify-end'
        : 'fixed inset-0 z-50 flex items-start justify-center overflow-x-hidden overflow-y-auto bg-black/70 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:items-center'}
      data-closing={isSheet ? closing : undefined}
      // `mousedown` no overlay, e não `click`, para que arrastar de dentro do
      // diálogo e soltar no overlay não feche o modal.
      onMouseDown={(event) => {
        if (dismissible && event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={isTransaction
          ? 'transaction-modal-panel flex max-h-[calc(100dvh-env(safe-area-inset-top)-0.5rem)] w-full flex-col overflow-hidden rounded-t-[28px] border border-zinc-700/70 bg-[#181818] shadow-2xl focus:outline-none md:max-h-[calc(100dvh-3rem)] md:max-w-lg md:rounded-[28px]'
          : isSheet
          ? `wallet-modal-panel max-h-[calc(100dvh-env(safe-area-inset-top))] w-full overflow-x-hidden overflow-y-auto rounded-t-3xl border border-zinc-800 bg-[#121212] pb-[env(safe-area-inset-bottom)] shadow-xl focus:outline-none md:max-h-none md:h-dvh md:rounded-none md:border-y-0 md:bg-[#1c1c1c]/95 md:backdrop-blur-md md:pb-0 ${variant === 'score' ? 'md:w-[min(100vw,520px)]' : 'md:w-[min(100vw,400px)]'}`
          : 'max-h-full w-full max-w-lg overflow-x-hidden overflow-y-auto rounded-2xl border border-zinc-800 bg-[#121212] shadow-xl focus:outline-none'}
      >
        {isTransaction && <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-zinc-500/70 md:hidden" />}
        <div className={isTransaction
          ? 'flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-5 py-4 md:px-6 md:py-5'
          : 'flex items-start justify-between gap-4 border-b border-zinc-800 p-6'}>
          <h2 id={titleId} className="text-xl font-bold text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={!dismissible}
            aria-label="Fechar"
            className={isTransaction
              ? 'grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/5 text-2xl leading-none text-gray-300 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40'
              : 'rounded-lg px-2 py-1 text-2xl leading-none text-gray-400 transition-colors hover:bg-zinc-900 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:text-gray-600 disabled:hover:bg-transparent'}
          >
            &times;
          </button>
        </div>

        <div className={isTransaction
          ? 'min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain px-5 py-5 md:px-6 md:py-6'
          : 'p-6'}>{children}</div>
        {footer && <div className="shrink-0 border-t border-white/10 bg-[#181818] px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-6 md:py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
