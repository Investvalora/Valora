import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useWallets } from '../../modules/portfolio/hooks/useWallets'
import { walletPalette } from '../../modules/portfolio/walletPalette'

/** Animated wallet stack. Positions are data-driven so new wallets need no CSS rules. */
export function WalletMorphSelector() {
  const { wallets, selectedWallet, selectWallet, isLoading, isError } = useWallets()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function closeOnOutsideClick(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        rootRef.current?.querySelector<HTMLButtonElement>('[aria-expanded="true"]')?.focus()
      }
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  if (!selectedWallet) {
    const label = isLoading
      ? 'Carregando carteiras…'
      : isError
        ? 'Erro ao carregar carteiras'
        : 'Nenhuma carteira'

    return (
      <span className="inline-flex h-[38px] w-[200px] items-center gap-2 rounded-full border border-white/10 bg-[#2b2b32] px-4 text-[13px] text-white/70" role="status">
        <span className="h-[9px] w-[9px] shrink-0 rounded-full bg-white/30" aria-hidden="true" />
        {label}
      </span>
    )
  }

  const orderedWallets = [
    selectedWallet,
    ...wallets.filter((wallet) => wallet.id !== selectedWallet.id),
  ]

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label="Selecionar carteira"
      className="relative isolate h-[38px] w-[200px] shrink-0"
    >
      {orderedWallets.map((wallet, index) => {
        const selected = wallet.id === selectedWallet.id
        const y = open ? index * 45 : index === 0 ? 0 : 1
        const scale = open || index === 0 ? 1 : 0.995

        return (
          <button
            key={wallet.id}
            type="button"
            title={wallet.name}
            aria-label={selected
              ? `Carteira atual: ${wallet.name}. ${open ? 'Fechar' : 'Abrir'} lista de carteiras`
              : `Selecionar carteira ${wallet.name}`}
            aria-expanded={selected ? open : undefined}
            aria-hidden={!selected && !open ? true : undefined}
            tabIndex={selected || open ? 0 : -1}
            onClick={() => {
              if (selected) setOpen((value) => !value)
              else {
                selectWallet(wallet.id)
                setOpen(false)
              }
            }}
                                                                                                                                                                                                              //velocidade com que a pill abre
            className={`group absolute inset-x-0 top-0 flex h-[38px] items-center gap-2.5 rounded-full border px-4 text-left text-[13px] font-medium transition-[transform,background-color,border-color,color] duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD95A] ${
              selected
                ? 'border-white/[0.10] bg-[#393939] text-white'
                : 'border-white/[0.08] bg-[#2f2f2f] text-white/80 hover:border-white/[0.12] hover:bg-[#454545]'
            }`}
            style={{
            zIndex: selected ? 30 : Math.max(1, 20 - index),
            transform: `translateY(${y}px) scale(${scale})`,
            transitionDelay: open && !selected ? `${Math.min(index, 4) * 45}ms` : '0ms', //intervalo entre as pills 
            pointerEvents: selected || open ? 'auto' : 'none',

            ...(!selected && {
              backgroundColor:
                index % 2 === 0
                  ? '#343434'
                  : '#2f2f2f',
            }),
          }}
          >
            <span
              className="relative h-[9px] w-[9px] shrink-0 rounded-full"
              style={{
                backgroundColor: walletPalette[wallet.color].color,
                boxShadow: `0 0 0 4px ${walletPalette[wallet.color].color}18, 0 0 12px ${walletPalette[wallet.color].color}59`,
              }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 overflow-hidden whitespace-nowrap">
              <span className={`inline-block whitespace-nowrap ${wallet.name.length > 24 ? 'transition-transform duration-[3000ms] delay-[600ms] ease-linear group-hover:-translate-x-[35%] motion-reduce:transition-none motion-reduce:group-hover:translate-x-0' : ''}`}>
                {wallet.name}
              </span>
            </span>
            {selected && (
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-white/60 transition-transform duration-500 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
                strokeWidth={2}
                aria-hidden="true"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
