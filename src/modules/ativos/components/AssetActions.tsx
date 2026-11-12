import { useState } from 'react'
import { ArrowLeft, MoreHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Modal } from '../../../shared/components/Modal'
import { DeferredQuickTransactionModal } from '../../portfolio/components/DeferredQuickTransactionModal'
import { TransactionHistory } from '../../portfolio/components/TransactionListModal'
import { useDeleteTransaction } from '../../portfolio/hooks/useTransactions'
import { useAssetDetail } from '../../assets/hooks/useAssetDetail'
import type { PositionRow } from '../../portfolio/types'
import { RefreshAssetDataButton } from '../../portfolio/components/AssetDataSyncNotice'

export function AssetActions({ row }: { row: PositionRow }) {
  const [action, setAction] = useState<'menu' | 'add' | 'list' | null>(null)
  const sheetOpen = action === 'menu' || action === 'list'

  return <>
    <button type="button" aria-label={`Opções de ${row.ticker}`} aria-haspopup="dialog" aria-expanded={sheetOpen} onClick={() => setAction('menu')} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-white/60 hover:bg-white/10"><MoreHorizontal size={20} aria-hidden="true" /></button>
    {sheetOpen && (
      <AssetActionSheet
        row={row}
        showHistory={action === 'list'}
        onHistory={() => setAction('list')}
        onBack={() => setAction('menu')}
        onAdd={() => setAction('add')}
        onClose={() => setAction(null)}
      />
    )}
    {action === 'add' && <AssetActionLaunch row={row} onClose={() => setAction(null)} />}
  </>
}

function AssetActionSheet({ row, showHistory, onHistory, onBack, onAdd, onClose }: {
  row: PositionRow
  showHistory: boolean
  onHistory: () => void
  onBack: () => void
  onAdd: () => void
  onClose: () => void
}) {
  const deletion = useDeleteTransaction(row.ticker)
  const optionClass = 'flex min-h-12 w-full items-center rounded-xl px-4 text-left text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-nf-purple disabled:opacity-45'
  return (
    <Modal
      isOpen
      title={`${showHistory ? 'Lançamentos' : 'Opções'} · ${row.ticker}`}
      variant="floating"
      floatingExpanded={showHistory}
      onClose={onClose}
      dismissible={!deletion.isPending}
      initialFocusSelector={showHistory ? '[data-history-back]' : '[data-history-open]'}
    >
      {showHistory ? (
        <div className="floating-sheet-history">
          <button type="button" data-history-back onClick={onBack} disabled={deletion.isPending}
            className="mb-2 flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm text-white/75 hover:bg-white/10 hover:text-white disabled:opacity-45">
            <ArrowLeft size={16} aria-hidden="true" />
            Voltar às opções
          </button>
          <TransactionHistory ticker={row.ticker} currency={row.currency ?? undefined} compact deletion={deletion} />
        </div>
      ) : (
        <div className="space-y-0.5">
          <button type="button" className={optionClass} onClick={onAdd}>Adicionar lançamento</button>
          <button type="button" className={optionClass} data-history-open onClick={onHistory}>Ver lançamentos</button>
          <RefreshAssetDataButton ticker={row.ticker} className={optionClass} onStarted={onClose} />
          <Link className={optionClass} to={`/ativo/${encodeURIComponent(row.ticker.toLowerCase())}`} onClick={onClose}>Ver resumo do ativo</Link>
        </div>
      )}
    </Modal>
  )
}

function AssetActionLaunch({ row, onClose }: { row: PositionRow; onClose: () => void }) {
  const rowAsset = row.type && row.currency
    ? { ticker: row.ticker, name: row.name ?? row.ticker, type: row.type, currency: row.currency }
    : undefined
  const catalog = useAssetDetail(rowAsset ? '' : row.ticker)

  if (!rowAsset && catalog.isLoading) {
    return (
      <Modal isOpen title="Adicionar Lançamento" onClose={onClose} variant="transaction" transactionDrawer>
        <p role="status">Carregando dados do ativo…</p>
      </Modal>
    )
  }

  return <DeferredQuickTransactionModal isOpen onClose={onClose} initialTicker={row.ticker} initialAsset={rowAsset ?? catalog.data ?? undefined} />
}
