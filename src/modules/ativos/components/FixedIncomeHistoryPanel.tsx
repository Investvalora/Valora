import { useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { useWallets } from '../../portfolio/hooks/useWallets'
import { useAddFixedIncomeEvent, useFixedIncomeHistory } from '../../portfolio/hooks/useFixedIncomeHistory'
import { useCalcFixedIncome } from '../../portfolio/hooks/useCalcFixedIncome'
import { matchesAssetFilters, useAssetFilters } from '../hooks/useAssetFilters'
import { fmtMoney } from '../utils/fmt'

const inputClass = 'mt-1 w-full rounded-lg border border-white/15 bg-[#262626] p-2 text-sm'

export function FixedIncomeHistoryPanel({ since = '' }: { since?: string }) {
  const { selectedWallet } = useWallets()
  const history = useFixedIncomeHistory(selectedWallet?.id ?? '')
  const mutation = useAddFixedIncomeEvent()
  const calculation = useCalcFixedIncome()
  const filters = useAssetFilters()
  const [open, setOpen] = useState(false)
  const [eventId, setEventId] = useState('')
  const [positionId, setPositionId] = useState('')
  const [type, setType] = useState<'coupon' | 'redemption'>('coupon')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState('')
  const [principal, setPrincipal] = useState('')
  const [balance, setBalance] = useState('')
  const [error, setError] = useState('')
  const positions = (history.data?.positions ?? []).filter((position) => matchesAssetFilters({ ticker: position.name, name: position.name, type: 'fixed_income' }, filters))
  const ids = new Set(positions.map((position) => position.id))
  const events = (history.data?.events ?? []).filter((event) => ids.has(event.position_id) && event.event_date >= since)
  const selected = positions.find((position) => position.id === positionId)
  const remaining = Number(selected?.remaining_principal ?? selected?.principal ?? 0)
  const lastDate = (history.data?.events ?? []).filter((event) => event.position_id === positionId).map((event) => event.event_date).sort().pop() ?? selected?.application_date
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    const gross = Number(amount), after = Number(balance), redeemed = type === 'redemption' ? Number(principal) : 0
    if (!selected || !Number.isFinite(gross) || gross <= 0 || !balance.trim() || !Number.isFinite(after) || after < 0 || !Number.isFinite(redeemed) || redeemed < 0 || redeemed > remaining || (type === 'redemption' && redeemed <= 0) || ((remaining - redeemed === 0) !== (after === 0)) || !date || date < (lastDate ?? '') || date > new Date().toISOString().slice(0, 10)) {
      setError('Confira data, valor recebido, principal resgatado e saldo restante do extrato.')
      return
    }
    try {
      await mutation.mutateAsync({ id: eventId, position_id: positionId, type, event_date: date, amount: gross, principal_redeemed: redeemed, balance_after: after })
      setOpen(false)
    } catch { setError('Não foi possível registrar. Confira a conexão e tente novamente; o mesmo registro não será duplicado.') }
  }
  return <section className="rounded-xl border border-white/10 p-5" aria-label="Movimentos de renda fixa">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-semibold">Renda fixa: cupons e resgates</h2><button type="button" disabled={!positions.some((position) => position.active)} onClick={() => { setEventId(crypto.randomUUID()); setPositionId(''); setType('coupon'); setAmount(''); setPrincipal(''); setBalance(''); setError(''); setOpen(true) }} className="rounded-full border border-white/15 px-3 py-2 text-sm disabled:opacity-40">Registrar recebimento</button></div>
    <p className="mb-4 text-xs text-white/50">Registre recebimentos já realizados e o saldo do extrato após cada movimento. Resgates encerrados continuam no histórico.</p>
    <button type="button" className="mb-4 text-sm text-nf-blue disabled:opacity-40" onClick={() => void calculation.calc()} disabled={calculation.isLoading || !positions.some((position) => position.active)}>{calculation.isLoading ? 'Atualizando saldos…' : 'Atualizar saldos da renda fixa'}</button>
    {calculation.error && <p role="alert" className="mb-3 text-sm text-red-300">{calculation.error}</p>}
    {calculation.state === 'success' && <p role="status" className="mb-3 text-sm text-green-300">Saldos atualizados.</p>}
    {history.isLoading ? <p role="status">Carregando renda fixa…</p> : history.isError ? <button type="button" onClick={() => void history.refetch()}>Não foi possível carregar. Tentar novamente</button> : !events.length ? <p className="text-sm text-white/50">Nenhum recebimento de renda fixa no período e filtros selecionados.</p> : <div className="overflow-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Recebimentos de renda fixa</caption><thead className="text-white/50"><tr><th>Título</th><th>Tipo</th><th>Data</th><th>Recebido</th><th>Saldo após</th></tr></thead><tbody>{[...events].reverse().map((event) => <tr key={event.id} className="border-t border-white/10"><td className="py-3">{positions.find((position) => position.id === event.position_id)?.name}</td><td>{event.type === 'coupon' ? 'Cupom' : 'Resgate'}</td><td>{event.event_date.split('-').reverse().join('/')}</td><td>{fmtMoney(Number(event.amount), 'BRL')}</td><td>{fmtMoney(Number(event.balance_after), 'BRL')}</td></tr>)}</tbody></table></div>}
    <Modal isOpen={open} title="Registrar recebimento de renda fixa" onClose={() => setOpen(false)} dismissible={!mutation.isPending}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block">Título<select className={inputClass} required value={positionId} onChange={(event) => setPositionId(event.target.value)}><option value="">Selecione</option>{positions.filter((position) => position.active).map((position) => <option key={position.id} value={position.id}>{position.name}</option>)}</select></label>
        {selected && <p className="text-xs text-white/60">Principal restante: {fmtMoney(remaining, 'BRL')}</p>}
        <label className="block">Recebimento<select className={inputClass} value={type} onChange={(event) => setType(event.target.value as typeof type)}><option value="coupon">Cupom de juros</option><option value="redemption">Resgate parcial ou total</option></select></label>
        <label className="block">Data<input className={inputClass} required type="date" min={lastDate} max={new Date().toISOString().slice(0, 10)} value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label className="block">Valor bruto recebido (R$)<input className={inputClass} required type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
        {type === 'redemption' && <label className="block">Principal resgatado (R$)<input className={inputClass} required type="number" min="0.01" max={remaining} step="0.01" value={principal} onChange={(event) => setPrincipal(event.target.value)} /></label>}
        <label className="block">Saldo bruto do título após o recebimento (R$)<input className={inputClass} required type="number" min="0" step="0.01" value={balance} onChange={(event) => setBalance(event.target.value)} /></label>
        <p className="text-xs text-white/50">Use zero no saldo apenas no resgate total. Inclua os movimentos em ordem de data. O valor recebido não é somado ao saldo dos investimentos.</p>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <button className="rounded-lg bg-nf-blue px-4 py-2 disabled:opacity-50" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Registrando…' : 'Registrar movimento'}</button>
      </form>
    </Modal>
  </section>
}
