import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Modal } from '../../../shared/components/Modal'
import { AddTransactionModal } from '../../portfolio/components/AddTransactionModal'
import { TransactionListModal } from '../../portfolio/components/TransactionListModal'
import type { PositionRow } from '../../portfolio/types'
import { RefreshAssetDataButton } from '../../portfolio/components/AssetDataSyncNotice'

export function AssetActions({ row }: { row: PositionRow }) {
  const [action, setAction] = useState<'menu' | 'add' | 'list' | null>(null)
  const optionClass = 'flex min-h-11 w-full items-center rounded-xl bg-white/5 px-4 text-left text-sm text-white hover:bg-white/10'
  return <>
    <button type="button" aria-label={`Opções de ${row.ticker}`} onClick={() => setAction('menu')} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-white/60 hover:bg-white/10"><MoreHorizontal size={20} /></button>
    <Modal isOpen={action === 'menu'} title={`Opções · ${row.ticker}`} onClose={() => setAction(null)}>
      <div className="space-y-2">
        <button type="button" className={optionClass} onClick={() => setAction('add')}>Adicionar lançamento</button>
        <button type="button" className={optionClass} onClick={() => setAction('list')}>Ver lançamentos</button>
        <RefreshAssetDataButton ticker={row.ticker} className={optionClass} onStarted={() => setAction(null)} />
        <Link className={optionClass} to={`/ativo/${encodeURIComponent(row.ticker.toLowerCase())}`} onClick={() => setAction(null)}>Ver resumo do ativo</Link>
      </div>
    </Modal>
    {action === 'add' && <AddTransactionModal isOpen onClose={() => setAction(null)} ticker={row.ticker} assetType={row.type} assetName={row.name} />}
    {action === 'list' && <TransactionListModal isOpen onClose={() => setAction(null)} ticker={row.ticker} />}
  </>
}
