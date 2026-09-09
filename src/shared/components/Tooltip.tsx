import { KeyboardEvent, ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  /**
   * Rótulo acessível do botão, com o contexto de *qual* dado ele explica —
   * numa tabela existe um botão por linha e "Informações" repetido não
   * distingue nada para quem navega por lista de elementos.
   */
  label: string
  children: ReactNode
}

/** Distância entre o botão e o painel, em px. */
const PANEL_OFFSET = 6

/** Precisa casar com `w-64` do painel para o clamp na borda direita. */
const PANEL_WIDTH = 256
const VIEWPORT_MARGIN = 8

/**
 * Altura estimada do painel para decidir o flip vertical antes de renderizar.
 * O conteúdo é curto (título + 2–3 linhas); superestimar aqui só antecipa o
 * flip, nunca deixa o painel sair pela base.
 */
const PANEL_MAX_HEIGHT = 160

interface PanelPosition {
  top: number
  left: number
}

/**
 * Ícone de informação com painel de procedência.
 *
 * Abre por **clique**, não por hover: hover não existe em toque e não é
 * alcançável por teclado, e a rastreabilidade da cotação é requisito — não
 * pode depender de um gesto que parte dos usuários não tem.
 *
 * O painel é renderizado em portal com `position: fixed` porque a tabela de
 * posições vive dentro de um `overflow-x-auto`: um popover posicionado dentro
 * da célula é recortado pela própria borda do container.
 */
export function Tooltip({ label, children }: TooltipProps) {
  const [position, setPosition] = useState<PanelPosition | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  const isOpen = position !== null

  const computePosition = useCallback((): PanelPosition | null => {
    const button = buttonRef.current
    if (!button) return null

    const rect = button.getBoundingClientRect()
    const maxLeft = Math.max(VIEWPORT_MARGIN, window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN)
    const left = Math.min(Math.max(rect.left, VIEWPORT_MARGIN), maxLeft)

    // Abre para baixo por padrão; vira para cima quando não cabe abaixo e há
    // mais espaço acima. Sem o flip, o painel das últimas linhas da tabela
    // (as de menor peso, no fim da ordenação padrão) abriria fora da tela.
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const flipUp = spaceBelow < PANEL_MAX_HEIGHT + PANEL_OFFSET && spaceAbove > spaceBelow

    if (flipUp) {
      const top = Math.max(VIEWPORT_MARGIN, rect.top - PANEL_OFFSET - PANEL_MAX_HEIGHT)
      return { top, left }
    }

    return { top: rect.bottom + PANEL_OFFSET, left }
  }, [])

  const close = useCallback(() => setPosition(null), [])

  const toggle = useCallback(() => {
    setPosition((current) => (current ? null : computePosition()))
  }, [computePosition])

  // Clique fora fecha. `pointerdown` e não `click`: um clique que começa fora e
  // termina sobre o painel não deveria manter o painel aberto por acidente.
  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: globalThis.MouseEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return

      close()
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isOpen, close])

  // Rolagem e redimensionamento movem o botão, e o painel é `fixed`: sem
  // recalcular, ele fica flutuando longe do dado que explica. `capture` pega
  // também a rolagem horizontal da própria tabela, que não borbulha.
  useEffect(() => {
    if (!isOpen) return

    const reposition = () => setPosition(computePosition())

    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)

    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [isOpen, computePosition])

  /**
   * Escape no wrapper cobre botão e painel: eventos de um portal borbulham pela
   * árvore React, não pela do DOM. `stopPropagation` evita que o mesmo Escape
   * feche um diálogo em volta — fecha-se só a camada mais interna.
   */
  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key !== 'Escape' || !isOpen) return

    event.stopPropagation()
    close()
    buttonRef.current?.focus()
  }

  return (
    <span className="relative inline-flex" onKeyDown={handleKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-expanded={isOpen}
        // Só descreve quando existe: `aria-describedby` apontando para um id
        // ausente é ignorado por parte dos leitores e engana a inspeção.
        aria-describedby={isOpen ? panelId : undefined}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-dark-border text-[11px] font-bold leading-none text-gray-400 transition-colors hover:border-blue-500 hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span aria-hidden="true">i</span>
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="tooltip"
            style={{ top: position.top, left: position.left }}
            className="fixed z-50 w-64 rounded-lg border border-dark-border bg-dark-surface p-3 text-left text-xs leading-relaxed text-gray-200 shadow-xl"
          >
            {children}
          </div>,
          document.body,
        )}
    </span>
  )
}
