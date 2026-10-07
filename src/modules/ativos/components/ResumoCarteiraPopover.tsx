/**
 * ResumoCarteiraPopover — popover lateral com resumo da carteira.
 * Renderizado via createPortal para ficar fora do fluxo normal do DOM.
 */
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

type ResumoCarteiraPopoverProps = {
  /** Âncora: ref do botão que abre o popover, para posicionamento */
  anchorRef: React.RefObject<HTMLElement | null>
  patrimonio: string
  valorInvestido: string
  ganhoCapital: string
  proventos12m: string
  dividendos: string
  rentabilidade: string
  onClose: () => void
}

export function ResumoCarteiraPopover({
  anchorRef,
  patrimonio,
  ganhoCapital,
  proventos12m,
  dividendos,
  rentabilidade,
  onClose,
}: ResumoCarteiraPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [anchorRef, onClose])

  // Fechar com Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Posicionar relativo à âncora
  const anchor = anchorRef.current
  let style: React.CSSProperties = { position: 'fixed', right: 24, top: 200, zIndex: 50 }
  if (anchor) {
    const rect = anchor.getBoundingClientRect()
    style = {
      position: 'fixed',
      right: window.innerWidth - rect.right,
      top: rect.bottom + 8,
      zIndex: 50,
    }
  }

  return createPortal(
    <div
      ref={popoverRef}
      style={style}
      className="
        w-[340px] rounded-2xl border border-white/[0.1]
        bg-[#1C1C1C] shadow-2xl p-5
      "
      role="dialog"
      aria-modal="false"
      aria-label="Resumo da carteira"
    >
      {/* Título */}
      <div className="mb-4">
        <h3 className="text-[15px] font-semibold text-white">Resumo da carteira</h3>
        <p className="text-[12px] text-white/40">Carteira 1 · desde o início</p>
      </div>

      {/* Linhas */}
      <div className="flex flex-col gap-3">
        {/* Patrimônio total */}
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-white/60">Patrimônio total</span>
          <span className="text-[13px] font-medium text-white">{patrimonio}</span>
        </div>

        {/* Lucro total */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-white/60">Lucro total</span>
            <span className="text-[13px] font-medium text-nf-green">{ganhoCapital}</span>
          </div>
          <p className="text-[11px] text-white/40">
            Ganho de capital {ganhoCapital} · Dividendos {dividendos}
          </p>
        </div>

        {/* Proventos recebidos */}
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-white/60">Proventos recebidos (12M)</span>
          <span className="text-[13px] font-medium text-white">{proventos12m}</span>
        </div>

        {/* Rentabilidade */}
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-white/60">Rentabilidade</span>
          <span className="text-[13px] font-medium text-nf-green">{rentabilidade}</span>
        </div>
      </div>

      {/* Link para Desempenho */}
      <div className="mt-5 border-t border-white/[0.08] pt-4">
        <a
          href="/desempenho"
          className="text-sm text-nf-blue hover:underline"
          onClick={onClose}
        >
          Ver detalhes em Desempenho →
        </a>
      </div>
    </div>,
    document.body,
  )
}
