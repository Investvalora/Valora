import { useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { toIsoDate } from '../../../shared/utils/isoDate'
import { useAssetDetail } from '../../assets/hooks/useAssetDetail'
import { useEditTransaction } from '../hooks/useTransactions'
import { movementDateSchema } from '../schemas/movementDateSchema'
import { parseDecimalPtBr } from '../schemas/positionSchema'
import type { Transaction, TransactionEdit } from '../services/transactionsService'

const decimal = (value: number) => value.toLocaleString('pt-BR', { useGrouping: false, maximumFractionDigits: 20 })
function EditTransactionDialog({ transaction, onClose }: { transaction: Transaction; onClose: () => void }) {
  const edit = useEditTransaction()
  const asset = useAssetDetail(transaction.ticker)
  const [type, setType] = useState<'buy' | 'sell'>(transaction.type === 'sell' ? 'sell' : 'buy')
  const [date, setDate] = useState(transaction.transaction_date)
  const [values, setValues] = useState({ quantity: decimal(Number(transaction.quantity)), price: decimal(Number(transaction.price)), brokerage_fee: decimal(Number(transaction.brokerage_fee)), tax: decimal(Number(transaction.tax)) })
  const [error, setError] = useState('')
  const [stale, setStale] = useState(false)
  const currency = asset.data?.currency
  const style = 'mt-2 min-h-12 w-full rounded-xl border border-white/20 bg-[#242424] px-3 text-base text-white focus:outline-none focus:ring-2 focus:ring-nf-purple disabled:opacity-50'
  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (edit.isPending || stale || !currency) return
    setError('')
    if (!movementDateSchema.safeParse(date).success) { setError('Informe uma data válida, até hoje.'); return }
    const numbers = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, parseDecimalPtBr(value)])) as Pick<TransactionEdit, 'quantity' | 'price' | 'brokerage_fee' | 'tax'>
    if (Object.values(numbers).some(value => !Number.isFinite(value) || value < 0) || numbers.quantity <= 0) {
      setError('Informe quantidade positiva e preço, custos e impostos válidos, usando vírgula para decimais.'); return
    }
    if (numbers.quantity !== Number(numbers.quantity.toFixed(8))) { setError('Use até 8 casas decimais na quantidade.'); return }
    if ([numbers.price,numbers.brokerage_fee,numbers.tax].some(value => value !== Number(value.toFixed(4)))) {
      setError('Use até 4 casas decimais nos preços, custos e impostos.'); return
    }
    try {
      await edit.mutateAsync({ original: transaction, changes: { type, transaction_date: date, ...numbers } })
      onClose()
    } catch (cause) {
      const code = typeof cause === 'object' && cause !== null && 'code' in cause ? cause.code : null
      if (code === '40001') { setStale(true); setError('Este lançamento foi alterado ou não está mais disponível. Feche e atualize a lista antes de editar novamente.') }
      else setError(code === '23514' ? 'A edição deixaria uma venda sem saldo na data ou contém valores inválidos. Confira a quantidade e a ordem das compras e vendas.'
        : 'Não foi possível salvar a alteração. Confira a lista antes de tentar novamente.')
    }
  }
  return <Modal isOpen title={`Editar lançamento · ${transaction.ticker}`} onClose={onClose} dismissible={!edit.isPending} variant="transaction">
    <form onSubmit={save} className="space-y-5" noValidate>
      <p className="text-sm leading-relaxed text-white/65">A alteração recalcula a posição e o histórico desta carteira. Ativo e carteira serão mantidos; a ordem de cadastro é preservada para operações do mesmo dia.</p>
      {!currency && <div role="status" className="text-sm text-white/70">{asset.isLoading ? 'Carregando moeda do ativo…' : 'Não foi possível carregar a moeda do ativo.'}{!asset.isLoading && <button type="button" onClick={() => asset.refetch()} className="ml-2 min-h-11 underline">Tentar novamente</button>}</div>}
      <fieldset disabled={edit.isPending || stale || !currency} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="text-sm text-white/80">Tipo<select className={style} value={type} onChange={event => setType(event.target.value as 'buy' | 'sell')}><option value="buy">Compra</option><option value="sell">Venda</option></select></label>
        <label className="text-sm text-white/80">Data da transação<input type="date" max={toIsoDate(new Date())} className={style} value={date} onChange={event => setDate(event.target.value)} /></label>
        {([
          ['quantity', 'Quantidade'], ['price', `Preço unitário (${currency ?? '—'})`],
          ['brokerage_fee', `Outros custos (${currency ?? '—'})`], ['tax', `Impostos (${currency ?? '—'})`],
        ] as const).map(([key, label]) => <label key={key} className="text-sm text-white/80">{label}<input inputMode="decimal" className={style} value={values[key]} onChange={event => setValues(previous => ({ ...previous, [key]: event.target.value }))} /></label>)}
      </fieldset>
      {error && <p role="alert" className="text-sm text-nf-pink">{error}</p>}
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" disabled={edit.isPending} onClick={onClose} className="min-h-11 rounded-xl border border-white/20 px-4 text-sm text-white disabled:opacity-40">Cancelar</button>
        <button type="submit" disabled={edit.isPending || stale || !currency} className="min-h-11 rounded-xl bg-[#393939] px-4 text-sm font-semibold text-white hover:bg-[#454545] disabled:opacity-40">{edit.isPending ? 'Salvando…' : 'Salvar alterações'}</button>
      </div>
    </form>
  </Modal>
}

export function EditTransactionButton({ transaction }: { transaction: Transaction }) {
  const [open, setOpen] = useState(false)
  if (transaction.type !== 'buy' && transaction.type !== 'sell') return null
  return <>
    <button type="button" onClick={() => setOpen(true)} aria-label={`Editar lançamento de ${transaction.ticker} em ${transaction.transaction_date}`} className="min-h-11 rounded-lg px-2 text-xs text-white/75 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple">Editar</button>
    {open && <EditTransactionDialog transaction={transaction} onClose={() => setOpen(false)} />}
  </>
}
