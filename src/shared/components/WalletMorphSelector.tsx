import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useWallets } from '../../modules/portfolio/hooks/useWallets'
import { walletPalette } from '../../modules/portfolio/walletPalette'

/** Pilha animada de carteiras na barra superior. */
export function WalletMorphSelector() {
  const { wallets, selectedWallet, selectWallet, isLoading, isError } = useWallets()
  const [open, setOpen] = useState(false)
  const [hasMoreBelow, setHasMoreBelow] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function closeOnOutsideClick(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
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

  const otherWallets = wallets.filter((wallet) => wallet.id !== selectedWallet.id)
  const visibleOptions = Math.min(otherWallets.length, 2)
  const listHeight = visibleOptions * 45

  function walletName(name: string) {
    return (
      <span className="min-w-0 flex-1 overflow-hidden whitespace-nowrap">
        <span className={`inline-block whitespace-nowrap ${name.length > 24 ? 'transition-transform duration-[3000ms] delay-[600ms] ease-linear group-hover:-translate-x-[35%] group-focus:-translate-x-[35%] motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-focus:translate-x-0' : ''}`}>
          {name}
        </span>
      </span>
    )
  }

  function walletDot(color: typeof selectedWallet.color) {
    const value = walletPalette[color]?.color ?? '#888'
    return (
      <span
        className="relative h-[9px] w-[9px] shrink-0 rounded-full"
        style={{
          backgroundColor: value,
          boxShadow: `0 0 0 4px ${value}18, 0 0 12px ${value}59`,
        }}
        aria-hidden="true"
      />
    )
  }

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label="Selecionar carteira"
      className="relative isolate h-[38px] w-[200px] shrink-0"
    >
      <button
        type="button"
        title={selectedWallet.name}
        aria-label={`Carteira atual: ${selectedWallet.name}. ${open ? 'Fechar' : 'Abrir'} lista de carteiras`}
        aria-expanded={open}
        aria-controls="wallet-selector-panel"
        onClick={() => {
          if (!open) {
            if (listRef.current) listRef.current.scrollTop = 0
            setHasMoreBelow(otherWallets.length > visibleOptions)
          }
          setOpen((value) => !value)
        }}
        className="group relative z-30 flex h-[38px] w-full items-center gap-2.5 rounded-full border border-white/[0.10] bg-[#393939] px-4 text-left text-[13px] font-medium text-white transition-colors hover:bg-[#454545] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD95A]"
      >
        {walletDot(selectedWallet.color)}
        {walletName(selectedWallet.name)}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-white/60 transition-transform duration-300 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
          strokeWidth={2}
          aria-hidden="true"
        />
      </button>

      {otherWallets.length > 0 && (
        <div
          id="wallet-selector-panel"
          ref={listRef}
          role="group"
          aria-label="Carteiras disponíveis"
          aria-hidden={!open}
          className={`wallet-selector-scroll absolute inset-x-0 top-[45px] z-20 overflow-y-auto overscroll-contain transition-[height] duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${open ? '' : 'pointer-events-none'} ${open && hasMoreBelow ? 'wallet-selector-fade' : ''}`}
          style={{ height: open ? `${listHeight}px` : '0px' }}
          onScroll={(event) => {
            const list = event.currentTarget
            setHasMoreBelow(list.scrollTop + list.clientHeight < list.scrollHeight - 2)
          }}
        >
          <div className="relative" style={{ height: `${otherWallets.length * 45}px` }}>
            {otherWallets.map((wallet, index) => (
              <button
                key={wallet.id}
                type="button"
                title={wallet.name}
                aria-label={`Selecionar carteira ${wallet.name}`}
                tabIndex={open ? 0 : -1}
                onClick={() => {
                  selectWallet(wallet.id)
                  setOpen(false)
                  rootRef.current?.querySelector<HTMLButtonElement>('[aria-expanded]')?.focus()
                }}
                className="group absolute inset-x-0 top-0 flex h-[38px] items-center gap-2.5 rounded-full border border-white/[0.08] bg-[#2f2f2f] px-4 text-left text-[13px] font-medium text-white/80 shadow-[0_6px_18px_rgba(0,0,0,0.22)] transition-[transform,background-color,border-color,color] duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-white/[0.12] hover:bg-[#454545] motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD95A]"
                style={{
                  transform: `translateY(${open ? index * 45 : -45}px)`,
                  transitionDelay: open ? `${Math.min(index, 3) * 45}ms` : '0ms',
                  zIndex: otherWallets.length - index,
                }}
              >
                {walletDot(wallet.color)}
                {walletName(wallet.name)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
