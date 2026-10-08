import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Plus, Settings } from 'lucide-react'
import { useWallets } from '../../modules/portfolio/hooks/useWallets'
import { walletPalette } from '../../modules/portfolio/walletPalette'

interface WalletMorphSelectorProps {
  /** Patrimônio total da carteira selecionada, em BRL. Passado pelo pai se disponível. */
  selectedWalletPatrimonio?: number | null
  /** Callback ao clicar em '+ Nova carteira'. */
  onNewWallet?: () => void
  /** Callback ao clicar em 'Gerenciar carteiras'. */
  onManageWallets?: () => void
}

/** Dropdown de seleção de carteiras na TopBar. */
export function WalletMorphSelector({
  selectedWalletPatrimonio,
  onNewWallet,
  onManageWallets,
}: WalletMorphSelectorProps = {}) {
  const { wallets, selectedWallet, selectWallet, isLoading, isError } = useWallets()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Fechar ao clicar fora
  useEffect(() => {
    if (!open) return

    function handleMouseDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  if (!selectedWallet) {
    const label = isLoading
      ? 'Carregando carteiras…'
      : isError
        ? 'Erro ao carregar carteiras'
        : 'Nenhuma carteira'

    return (
      <span
        className="inline-flex h-[38px] w-[200px] items-center gap-2 rounded-full border border-white/10 bg-[#2b2b32] px-4 text-[13px] text-white/70"
        role="status"
      >
        <span className="h-[9px] w-[9px] shrink-0 rounded-full bg-white/30" aria-hidden="true" />
        {label}
      </span>
    )
  }

  const patrimonioFormatted =
    selectedWalletPatrimonio != null && Number.isFinite(selectedWalletPatrimonio)
      ? selectedWalletPatrimonio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : null

  return (
    <div ref={rootRef} className="relative" role="group" aria-label="Selecionar carteira">
      {/* Botão trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Carteira atual: ${selectedWallet.name}. ${open ? 'Fechar' : 'Abrir'} lista de carteiras`}
        className="flex h-[38px] items-center gap-2.5 rounded-full border border-white/[0.10] bg-[#393939] px-4 text-[13px] font-medium text-white transition-colors hover:bg-white/[0.12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD95A]"
      >
        <span
          className="h-[9px] w-[9px] shrink-0 rounded-full"
          style={{ backgroundColor: walletPalette[selectedWallet.color].color }}
          aria-hidden="true"
        />
        <span className="max-w-[130px] overflow-hidden text-ellipsis whitespace-nowrap">
          {selectedWallet.name}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-white/60 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          strokeWidth={2}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          aria-label="Carteiras"
          className="absolute left-0 top-full z-50 mt-2 min-w-[240px] rounded-2xl border border-white/[0.1] bg-[#1C1C1C] py-2 shadow-2xl"
        >
          {/* Header */}
          <p className="px-4 py-1 text-xs uppercase tracking-wide text-white/40">Carteiras</p>

          {/* Lista de carteiras */}
          {wallets.map((wallet) => {
            const isSelected = wallet.id === selectedWallet.id
            const dot = walletPalette[wallet.color]?.color ?? '#888'

            return (
              <button
                key={wallet.id}
                type="button"
                aria-selected={isSelected}
                aria-label={
                  isSelected
                    ? `Carteira atual: ${wallet.name}`
                    : `Selecionar carteira ${wallet.name}`
                }
                onClick={() => {
                  selectWallet(wallet.id)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left transition-colors hover:bg-white/[0.05]"
              >
                {/* Dot colorido */}
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: dot }}
                  aria-hidden="true"
                />

                {/* Nome + patrimônio */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{wallet.name}</p>
                  <p className="text-xs text-white/50">
                    {isSelected && patrimonioFormatted !== null ? patrimonioFormatted : '—'}
                  </p>
                </div>

                {/* Checkmark na selecionada */}
                {isSelected && (
                  <Check
                    className="h-3.5 w-3.5 shrink-0 text-nf-blue"
                    strokeWidth={2.5}
                    aria-hidden="true"
                  />
                )}
              </button>
            )
          })}

          {/* Divider */}
          <div className="mx-2 my-1 border-t border-white/[0.08]" />

          {/* Nova carteira */}
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onNewWallet?.()
            }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm text-nf-blue transition-colors hover:bg-white/[0.05]"
          >
            <Plus className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            + Nova carteira
          </button>

          {/* Gerenciar carteiras */}
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onManageWallets?.()
            }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm text-nf-blue transition-colors hover:bg-white/[0.05]"
          >
            <Settings className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            Gerenciar carteiras
          </button>
        </div>
      )}
    </div>
  )
}
