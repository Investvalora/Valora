import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Modal } from '../../../shared/components/Modal'
import { QuickTransactionModal } from '../../portfolio/components/QuickTransactionModal'
import type { PositionRow } from '../../portfolio/types'
import { fmtMoney } from '../utils/fmt'

export function FixedIncomeActions({ name, lots }: { name: string; lots: PositionRow[] }) {
  const [menu, setMenu] = useState(false)
  const [action, setAction] = useState<'add' | 'list' | null>(null)
  const product = lots[0]?.fixedIncome
  const canAdd = product && !product.type.startsWith('tesouro_')
  return <>
    <button type="button" aria-label={`Opções de ${name}`} onClick={() => setMenu(true)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-white/60 hover:bg-white/10"><MoreHorizontal size={20} /></button>
    <Modal isOpen={menu} title={name} onClose={() => setMenu(false)}>
      <div className="space-y-2">
        {canAdd && <button type="button" className="min-h-11 w-full rounded-xl bg-white/5 px-4 text-left text-sm text-white hover:bg-white/10" onClick={() => { setMenu(false); setAction('add') }}>Adicionar lançamento</button>}
        <button type="button" className="min-h-11 w-full rounded-xl bg-white/5 px-4 text-left text-sm text-white hover:bg-white/10" onClick={() => { setMenu(false); setAction('list') }}>Ver aplicações</button>
      </div>
    </Modal>
    {action === 'add' && product && <QuickTransactionModal isOpen onClose={() => setAction(null)} initialFixedIncome={{ name, type: product.type, rate: product.rate }} />}
    <Modal isOpen={action === 'list'} title={`Aplicações · ${name}`} onClose={() => setAction(null)}>
      <ul className="max-h-[60dvh] space-y-3 overflow-y-auto">
        {lots.map((lot) => <li key={lot.id} className="rounded-xl border border-white/10 p-4 text-sm text-white">
          <p className="font-medium">{lot.acquisitionDate ? lot.acquisitionDate.slice(0, 10).split('-').reverse().join('/') : 'Data não informada'}</p>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-xs"><dt className="text-white/50">Principal restante</dt><dd className="text-right">{fmtMoney(lot.averagePrice)}</dd><dt className="text-white/50">Saldo bruto</dt><dd className="text-right">{fmtMoney(lot.marketValueBRL)}</dd></dl>
        </li>)}
      </ul>
    </Modal>
  </>
}
