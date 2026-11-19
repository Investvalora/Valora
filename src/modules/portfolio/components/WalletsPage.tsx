import { Check, Settings, Plus, Trash2 } from 'lucide-react'
import { InformationHelp } from '../../../shared/components/InformationHelp'
import { LoadingState } from '../../../shared/components/LoadingState'
import { useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { useWallets } from '../hooks/useWallets'
import type { Wallet } from '../services/walletService'
import { walletPalette } from '../walletPalette'
import { WalletEditorDialog } from './WalletEditorDialog'
import { DeleteWalletDialog } from './DeleteWalletDialog'
import { useWalletTotals } from '../hooks/useWalletTotals'
import { WalletsTotal } from './WalletsTotal'

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function WalletsPage() {
  const { wallets, selectedWallet, selectWallet, isLoading, isError, refetch } = useWallets()
  const { totals, isLoading: totalsLoading, isError: totalsError } = useWalletTotals()
  const [searchParams, setSearchParams] = useSearchParams()
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null)
  const [editingOpen, setEditingOpen] = useState(false)
  const [deletingWallet, setDeletingWallet] = useState<Wallet | null>(null)
  const creating = searchParams.get('nova') === '1'

  function openCreate() {
    setEditingOpen(false)
    setEditingWallet(null)
    setSearchParams({ nova: '1' })
  }

  function closeEditor() {
    if (creating) setSearchParams({}, { replace: true })
    setEditingOpen(false)
  }

  const orderedWallets = [...wallets].sort((a, b) => {
    if (a.is_default !== b.is_default) return a.is_default ? -1 : 1
    return a.created_at.localeCompare(b.created_at)
  })

  return (
    <div className="mx-auto w-full max-w-5xl px-6 pb-12 pt-8 md:px-0 md:pt-10">
      <header className="mb-9 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="flex items-center gap-1">
            <h1 className="text-3xl font-semibold tracking-tight text-white">Carteiras</h1>
            <InformationHelp topic="allocation" />
          </div>
          <p className="mt-2 max-w-xl text-sm text-white/50">
            Organize suas carteiras e escolha qual deseja acompanhar no aplicativo.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-zinc-950 transition-[transform,background-color] duration-200 hover:bg-zinc-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nova carteira
        </button>
      </header>

      <WalletsTotal wallets={wallets} totals={totals} isLoading={isLoading || totalsLoading} isError={isError || totalsError} />

      {isLoading && <LoadingState label="Carregando carteiras…" variant="table" />}
      {isError && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
          <p className="text-sm text-red-300">Não foi possível carregar suas carteiras.</p>
          <button type="button" onClick={() => void refetch()} className="mt-3 text-sm font-medium text-white underline underline-offset-4">
            Tentar novamente
          </button>
        </div>
      )}
      {!isLoading && !isError && orderedWallets.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center">
          <p className="text-base font-medium text-white">Você ainda não tem carteiras.</p>
          <p className="mt-2 text-sm text-white/50">Crie uma carteira para começar a organizar seus investimentos.</p>
          <button type="button" onClick={openCreate} className="mt-5 text-sm font-semibold text-white underline underline-offset-4">
            Criar carteira
          </button>
        </div>
      )}
      {!isLoading && !isError && orderedWallets.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {orderedWallets.map((wallet) => {
            const palette = walletPalette[wallet.color]
            const selected = selectedWallet?.id === wallet.id
            return (
              <article key={wallet.id} className="relative rounded-2xl border border-white/10" style={{ backgroundColor: palette.color, color: palette.textColor }}>
                  <button
                    type="button"
                    onClick={() => selectWallet(wallet.id)}
                    disabled={selected}
                    aria-label={selected ? `${wallet.name} selecionada` : `Selecionar ${wallet.name}`}
                    aria-pressed={selected}
                    className="absolute inset-0 rounded-2xl transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#131313]"
                    style={selected ? { boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.24)' } : undefined}
                  />
                <div className="pointer-events-none relative flex min-h-44 flex-col justify-between gap-7 p-5">
                  <div>
                    <p className="pr-24 text-[10px] opacity-70">{wallet.is_default ? 'Carteira principal' : 'Carteira'}</p>
                    <h2 className="mt-1 break-words pr-24 text-xl font-semibold leading-tight">{wallet.name}</h2>
                  </div>
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-[11px] opacity-70">Patrimônio total</p>
                      <strong className="mt-1 block break-words text-xl leading-tight tabular-nums">{totalsLoading ? 'Carregando…' : totalsError ? 'Indisponível' : totals.get(wallet.id) === null ? '—' : money.format(totals.get(wallet.id) ?? 0)}</strong>
                    </div>
                    {selected && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold text-white"><Check className="h-3 w-3" aria-hidden="true" />Selecionada</span>}
                  </div>
                </div>
                <div className="absolute right-3 top-3 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingWallet(wallet)
                      setEditingOpen(true)
                    }}
                    aria-label={`Editar ${wallet.name}`}
                    className="grid h-11 w-11 place-items-center rounded-full bg-black/15 transition-colors hover:bg-black/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
                  >
                    <Settings className="h-4 w-4" aria-hidden="true" />
                  </button>
                  {!wallet.is_default && <button type="button" onClick={() => setDeletingWallet(wallet)} aria-label={`Excluir ${wallet.name}`} className="grid h-11 w-11 place-items-center rounded-full bg-black/15 transition-colors hover:bg-black/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>}
                </div>
              </article>
            )
          })}
        </div>
      )}

      <WalletEditorDialog
        isOpen={creating || editingOpen}
        wallet={creating ? null : editingWallet}
        onClose={closeEditor}
      />
      {deletingWallet && <DeleteWalletDialog key={deletingWallet.id} wallet={deletingWallet} selected={deletingWallet.id === selectedWallet?.id} onClose={() => setDeletingWallet(null)} />}
    </div>
  )
}
