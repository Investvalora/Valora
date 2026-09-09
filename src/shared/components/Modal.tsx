import { KeyboardEvent, ReactNode, useCallback, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  isOpen: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /**
   * `false` bloqueia Escape, clique no overlay e o botão de fechar. Existe para
   * o intervalo em que uma escrita está em voo: fechar no meio desmonta quem
   * dispara a revalidação e o feedback de sucesso, e a linha gravada só
   * apareceria no próximo carregamento.
   */
  dismissible?: boolean
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/**
 * Diálogo modal acessível: renderizado em portal no `body`, com `role="dialog"`
 * e `aria-modal`, foco preso enquanto aberto, Escape e clique no overlay
 * fechando, e foco devolvido ao elemento que o abriu.
 *
 * Não usa `<dialog>` nativo porque o suporte a estilização do backdrop ainda
 * é irregular e o fechamento nativo por Escape escapa ao controle do React.
 */
export function Modal({ isOpen, title, onClose, children, dismissible = true }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
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
    const target = focusable.length > 0 ? focusable[0] : dialogRef.current
    target?.focus()

    return () => {
      previouslyFocusedRef.current?.focus()
    }
  }, [isOpen, getFocusable])

  // Impede a página de fundo de rolar sob o modal.
  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

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
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:items-center"
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
        className="w-full max-w-lg rounded-lg border border-dark-border bg-dark-surface shadow-xl focus:outline-none"
      >
        <div className="flex items-start justify-between gap-4 border-b border-dark-border p-6">
          <h2 id={titleId} className="text-xl font-bold text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={!dismissible}
            aria-label="Fechar"
            className="rounded-lg px-2 py-1 text-2xl leading-none text-gray-400 transition-colors hover:bg-dark-bg hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:text-gray-600 disabled:hover:bg-transparent"
          >
            &times;
          </button>
        </div>

        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
