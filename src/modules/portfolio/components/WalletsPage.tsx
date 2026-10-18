import { Check, Pencil, Plus } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { useWallets } from '../hooks/useWallets'
import type { Wallet } from '../services/walletService'
import { walletPalette } from '../walletPalette'
import { WalletEditorDialog } from './WalletEditorDialog'

export function WalletsPage() {
  const { wallets, selectedWallet, selectWallet, isLoading, isError, refetch } = useWallets()
  const [searchParams, setSearchParams] = useSearchParams()
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null)
  const [editingOpen, setEditingOpen] = useState(false)
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
          <h1 className="text-3xl font-semibold tracking-tight text-white">Carteiras</h1>
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

      {isLoading && <p className="text-sm text-white/50">Carregando carteiras…</p>}
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
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(205px,1fr))]">
          {orderedWallets.map((wallet) => {
            const palette = walletPalette[wallet.color]
            const selected = selectedWallet?.id === wallet.id
            return (
              <article key={wallet.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#1c1c1c]">
                <div
                  className="flex min-h-24 flex-col justify-between p-4"
                  style={{ backgroundColor: palette.color, color: palette.textColor }}
                >
                  <span className="text-xs font-medium opacity-75">{wallet.is_default ? 'Carteira principal' : 'Carteira'}</span>
                  <h2 className="break-words text-lg font-semibold">{wallet.name}</h2>
                </div>
                <div className="flex items-center justify-between gap-2 p-2">
                  <button
                    type="button"
                    onClick={() => selectWallet(wallet.id)}
                    disabled={selected}
                    aria-label={selected ? `${wallet.name} selecionada` : `Selecionar ${wallet.name}`}
                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors ${selected ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                    style={selected ? { boxShadow: `0 0 0 1px ${palette.color}` } : undefined}
                  >
                    {selected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                    {selected ? 'Selecionada' : 'Selecionar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingWallet(wallet)
                      setEditingOpen(true)
                    }}
                    aria-label={`Editar ${wallet.name}`}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    Editar
                  </button>
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
    </div>
  )
}
