import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { useAuth } from '../../auth/hooks/useAuth'
import type { DashboardData } from '../../dashboard/hooks/useDashboard'
import { assetClassColor } from '../composition'
import { useWalletTotals } from '../hooks/useWalletTotals'
import { useWallets } from '../hooks/useWallets'
import type { Wallet } from '../services/walletService'
import { walletPalette } from '../walletPalette'
import { WalletEditorDialog } from './WalletEditorDialog'

const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

interface SwipeGesture {
  startX: number
  startY: number
  horizontal: boolean
}

function formatMoney(value: number | null | undefined) {
  return value === null || value === undefined ? '—' : money.format(value)
}

function formatWalletTotal(
  walletId: string,
  totals: Map<string, number | null>,
  isLoading: boolean,
  isError: boolean,
) {
  if (isLoading) return 'Carregando…'
  if (isError) return 'Indisponível'
  const value = totals.get(walletId)
  return formatMoney(value === undefined ? 0 : value)
}

function WealthBars({ data }: { data: DashboardData['monthlySeries'] }) {
  const points = data.slice(-7)
  const max = Math.max(1, ...points.map((point) => point.totalBRL ?? 0))

  if (points.length === 0) {
    return <p className="py-12 text-sm text-zinc-500">Ainda não há histórico para esta carteira.</p>
  }

  return (
    <div>
      <p className="mb-3 text-xs text-zinc-500">Valor aplicado</p>
      <div
        className="flex h-32 items-end justify-between gap-3 border-b border-zinc-600"
        role="img"
        aria-label="Evolução mensal do patrimônio"
      >
        {points.map((point) => {
          const total = Math.max(0, point.totalBRL ?? 0)
          const invested = Math.min(total, Math.max(0, point.investedBRL ?? 0))
          const height = (total / max) * 100
          const investedHeight = total > 0 ? (invested / total) * 100 : 0

          return (
            <div
              key={point.month}
              className="flex h-full flex-1 items-end justify-center"
              title={`${point.month}: ${formatMoney(total)}`}
            >
              <div
                className="relative w-full max-w-7 rounded-t-sm bg-green-600"
                style={{ height: `${height}%` }}
              >
                <div
                  className="absolute bottom-0 w-full bg-green-300/70"
                  style={{ height: `${investedHeight}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-5 text-xs text-zinc-500">Ganho de capital</p>
    </div>
  )
}

function CompositionDonut({ slices }: { slices: DashboardData['compositionSlices'] }) {
  if (slices.length === 0) {
    return <p className="py-12 text-sm text-zinc-500">Ainda não há ativos avaliados.</p>
  }

  let start = 0
  const stops = slices.map((slice) => {
    const end = start + slice.percent
    const stop = `${assetClassColor(slice.type)} ${start}% ${end}%`
    start = end
    return stop
  })

  return (
    <div className="flex items-center gap-5">
      <div
        className="h-36 w-36 shrink-0 rounded-full p-[20px]"
        style={{ background: `conic-gradient(${stops.join(', ')})` }}
        aria-hidden="true"
      >
        <div className="h-full w-full rounded-full bg-[#121212]" />
      </div>
      <ul className="min-w-0 space-y-2 text-sm text-white">
        {slices.map((slice) => (
          <li key={slice.type} className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: assetClassColor(slice.type) }}
            />
            <span className="truncate">{slice.label}</span>
            <span className="text-zinc-400">{Math.round(slice.percent)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function MobileCarteiraHome({
  dashboard,
  onAddTransaction,
  children,
}: {
  dashboard: DashboardData
  onAddTransaction: () => void
  children?: ReactNode
}) {
  const { user } = useAuth()
  const { wallets, selectedWallet, selectWallet, isLoading, isError, refetch } = useWallets()
  const { totals, isLoading: totalsLoading, isError: totalsError } = useWalletTotals()
  const [showWallets, setShowWallets] = useState(false)
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null)
  const [showWalletForm, setShowWalletForm] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [actionAnimationId, setActionAnimationId] = useState(0)
  const [viewportSize, setViewportSize] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }))
  const swipeGesture = useRef<SwipeGesture | null>(null)
  const pageRef = useRef<HTMLElement | null>(null)
  const actionTimerRef = useRef<number | null>(null)

  useEffect(() => {
    function updateViewportSize() {
      setViewportSize({
        width: pageRef.current?.clientWidth || window.innerWidth,
        height: window.innerHeight,
      })
    }

    updateViewportSize()
    window.addEventListener('resize', updateViewportSize)
    return () => window.removeEventListener('resize', updateViewportSize)
  }, [])

  useEffect(() => {
    return () => {
      if (actionTimerRef.current !== null) {
        window.clearTimeout(actionTimerRef.current)
      }
    }
  }, [])

  const orderedWallets = [...wallets].sort((first, second) => {
    if (first.is_default !== second.is_default) {
      return first.is_default ? -1 : 1
    }
    return first.created_at.localeCompare(second.created_at)
  })
  const closedStackCount = Math.min(3, orderedWallets.length)

  const fullName = user?.user_metadata?.full_name
  const firstName = typeof fullName === 'string' && fullName.trim()
    ? fullName.trim().split(/\s+/)[0]
    : user?.email?.split('@')[0] ?? 'investidor'
  const initial = firstName.charAt(0).toUpperCase()
  const revealProgress = Math.max(
    0,
    Math.min(1, Number(showWallets) - dragOffset / viewportSize.width),
  )
  const cardWidth = Math.min(viewportSize.width - 64, 368)
  const openCardLeft = (viewportSize.width - cardWidth) / 2

  function onTouchStart(event: React.TouchEvent<HTMLElement>) {
    if (event.touches.length !== 1 || showWalletForm) return

    swipeGesture.current = {
      startX: event.touches[0].clientX,
      startY: event.touches[0].clientY,
      horizontal: false,
    }
  }

  function onTouchMove(event: React.TouchEvent<HTMLElement>) {
    const gesture = swipeGesture.current
    if (!gesture || event.touches.length !== 1) return

    const deltaX = event.touches[0].clientX - gesture.startX
    const deltaY = event.touches[0].clientY - gesture.startY

    if (!gesture.horizontal) {
      if (Math.abs(deltaX) < 10 || Math.abs(deltaX) < Math.abs(deltaY) * 1.3) {
        return
      }
      gesture.horizontal = true
      setIsDragging(true)
    }

    const pageWidth = pageRef.current?.clientWidth || window.innerWidth
    const allowedOffset = showWallets
      ? Math.max(0, Math.min(deltaX, pageWidth))
      : Math.min(0, Math.max(deltaX, -pageWidth))

    setDragOffset(allowedOffset)
  }

  function onTouchEnd(event: React.TouchEvent<HTMLElement>) {
    const gesture = swipeGesture.current
    swipeGesture.current = null
    if (!gesture) return

    const deltaX = event.changedTouches[0].clientX - gesture.startX
    const deltaY = event.changedTouches[0].clientY - gesture.startY
    const pageWidth = pageRef.current?.clientWidth || window.innerWidth
    const threshold = Math.min(90, Math.max(55, pageWidth * 0.18))

    if (Math.abs(deltaX) >= threshold && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      if (!showWallets && deltaX < 0) setShowWallets(true)
      if (showWallets && deltaX > 0) setShowWallets(false)
    }

    setDragOffset(0)
    setIsDragging(false)
  }

  function onTouchCancel() {
    swipeGesture.current = null
    setDragOffset(0)
    setIsDragging(false)
  }

  function openWalletForm(wallet: Wallet | null) {
    setEditingWallet(wallet)
    setShowWalletForm(true)
  }

  function handleHeaderAction() {
    setActionAnimationId((current) => current + 1)

    if (actionTimerRef.current !== null) {
      window.clearTimeout(actionTimerRef.current)
    }

    actionTimerRef.current = window.setTimeout(() => {
      actionTimerRef.current = null

      if (showWallets) {
        openWalletForm(null)
      } else {
        onAddTransaction()
      }
    }, 170)
  }

  return (
    <section
      ref={pageRef}
      className="relative min-h-[calc(100dvh-5rem)] overflow-hidden bg-[#121212] pb-28 text-white touch-pan-y"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
      style={{
        minHeight: showWallets
          ? `${Math.max(viewportSize.height - 80, 190 + orderedWallets.length * 180)}px`
          : undefined,
      }}
    >
      <div className="relative z-20 mx-auto max-w-md px-4 pt-6">
        <header className="flex items-center justify-between">
          <Link
            to="/conta"
            aria-label="Abrir minha conta"
            className="grid h-8 w-8 place-items-center rounded-full bg-purple-500 text-sm font-semibold"
          >
            {initial}
          </Link>
          {(!children || showWallets) && <button
              key={`${showWallets ? 'new-wallet' : 'new-transaction'}-${actionAnimationId}`}
              type="button"
              onClick={handleHeaderAction}
              className="wallet-action-button min-h-11 rounded-full px-5 py-2.5 text-sm font-medium"
            >
              {showWallets ? '+ Carteira' : '+ Lançamento'}
            </button>}
        </header>
      </div>

      <div
        data-testid="wallet-slide-track"
        className="relative w-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        style={{
          transform: `translate3d(calc(${showWallets ? '-100%' : '0%'} + ${dragOffset}px), 0, 0)`,
          transitionDuration: isDragging ? '0ms' : undefined,
        }}
      >
        <div
          aria-hidden={showWallets}
          ref={(node) => {
            if (node) node.inert = showWallets
          }}
        >
          {children ?? <div className="relative mx-auto max-w-md px-8 pt-9">
            <h1 className="text-2xl font-medium">Olá, {firstName}</h1>
            <p className="mt-1 text-xs text-zinc-500">{selectedWallet?.name ?? 'Sua carteira'}</p>

            <div className="mt-12 grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-zinc-400">Patrimônio total</p>
                <p className="text-[clamp(1.15rem,5vw,1.5rem)] font-medium leading-tight tabular-nums break-words">
                  {formatMoney(dashboard.totalPatrimonioBRL)}
                </p>
              </div>
              <div>
                <p className="text-sm text-zinc-400">Lucro total</p>
                <p className="text-[clamp(1.15rem,5vw,1.5rem)] font-medium leading-tight tabular-nums break-words">
                  {formatMoney(dashboard.lucroTotalBRL)}
                </p>
                <p className="mt-2 text-sm text-zinc-500">Ganho de capital</p>
                <p className="text-sm text-zinc-400 tabular-nums">
                  {formatMoney(dashboard.ganhoCapitalBRL)}
                </p>
              </div>
            </div>

            {dashboard.isLoading ? (
              <p className="mt-12 text-sm text-zinc-500">Carregando dados da carteira…</p>
            ) : dashboard.isError ? (
              <button
                type="button"
                onClick={dashboard.refetch}
                className="mt-12 text-sm text-red-300"
              >
                Não foi possível carregar os dados. Tentar novamente
              </button>
            ) : (
              <>
                <section className="mt-11" aria-labelledby="mobile-wealth-title">
                  <h2 id="mobile-wealth-title" className="mb-4 text-base font-semibold">
                    Evolução do Patrimônio
                  </h2>
                  <WealthBars data={dashboard.monthlySeries} />
                </section>
                <section className="mt-12" aria-labelledby="mobile-composition-title">
                  <h2 id="mobile-composition-title" className="mb-5 text-base font-semibold">
                    Ativos na carteira
                  </h2>
                  <CompositionDonut slices={dashboard.compositionSlices} />
                </section>
              </>
            )}
          </div>}
        </div>

        <div
          aria-hidden={!showWallets}
          ref={(node) => {
            if (node) node.inert = !showWallets
          }}
          className="absolute left-full top-0 max-h-[calc(100dvh-9rem)] w-full overflow-y-auto"
        >
          <div className="mx-auto max-w-md px-8 pb-10 pt-8">
            <div className="mb-5 flex items-center justify-between">
              <h1 className="text-3xl font-semibold">Carteiras</h1>
              <button
                type="button"
                onClick={() => setShowWallets(false)}
                className="text-sm text-zinc-600 border border-zinc-600 rounded-xl py-1 px-1"
              >
                Voltar
              </button>
            </div>
            {isLoading && <p className="text-sm text-zinc-400">Carregando carteiras…</p>}
            {isError && (
              <button type="button" onClick={() => void refetch()} className="text-sm text-red-300">
                Não foi possível carregar. Tentar novamente
              </button>
            )}
          </div>
        </div>
      </div>

      {orderedWallets.map((wallet, index) => {
        const closedSlot = Math.min(index, closedStackCount - 1)
        const closedLeft = viewportSize.width - (closedStackCount - closedSlot) * 9 - 7
        const openTop = 160 + index * 180
        const left = closedLeft + (openCardLeft - closedLeft) * revealProgress
        const top = 90 + (openTop - 90) * revealProgress
        const color = walletPalette[wallet.color].color

        return (
          <div
            key={wallet.id}
            data-testid="wallet-card"
            className="absolute h-36 rounded-2xl border-l border-white/20 p-5 transition-[left,top,box-shadow,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            style={{
              left: `${left}px`,
              top: `${top}px`,
              opacity: index < closedStackCount ? 1 : revealProgress,
              width: `${cardWidth}px`,
              backgroundColor: color,
              color: walletPalette[wallet.color].textColor,
              zIndex: index + 10,
              filter: `drop-shadow(-4px 0 9px ${color}55)`,
              boxShadow: `0 0 ${Math.round(revealProgress * 16)}px ${color}55`,
              pointerEvents: index >= closedStackCount && !showWallets ? 'none' : 'auto',
              transitionDuration: isDragging ? '0ms' : undefined,
            }}
            aria-hidden={!showWallets && index > 0}
          >
            <button
              type="button"
              onClick={() => {
                if (!showWallets) {
                  setShowWallets(true)
                  return
                }
                selectWallet(wallet.id)
                setShowWallets(false)
              }}
              className="flex h-full w-full flex-col items-start justify-between text-left"
              aria-label={showWallets
                ? `Selecionar ${wallet.name}`
                : `Ver e selecionar carteiras: ${orderedWallets.length}`}
              tabIndex={showWallets || index === 0 ? 0 : -1}
            >
              <span
                className="pr-8 text-xl font-semibold transition-opacity duration-300"
                style={{ opacity: revealProgress }}
              >
                {wallet.name}
              </span>
              <span
                className="text-sm font-medium transition-opacity duration-300"
                style={{ opacity: revealProgress }}
              >
                Patrimônio total
                <strong className="mt-1 block text-lg">
                  {formatWalletTotal(wallet.id, totals, totalsLoading, totalsError)}
                </strong>
              </span>
            </button>
            <button
              type="button"
              onClick={() => openWalletForm(wallet)}
              aria-label={`Editar ${wallet.name}`}
              aria-hidden={!showWallets}
              tabIndex={showWallets ? 0 : -1}
              className="absolute right-3 top-3 rounded-full bg-black/25 p-1.5 transition-opacity duration-300"
              style={{
                opacity: revealProgress,
                pointerEvents: showWallets ? 'auto' : 'none',
              }}
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        )
      })}

      <WalletEditorDialog
        isOpen={showWalletForm}
        wallet={editingWallet}
        onClose={() => setShowWalletForm(false)}
      />
    </section>
  )
}
